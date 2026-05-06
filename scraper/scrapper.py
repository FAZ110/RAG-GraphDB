from playwright.sync_api import sync_playwright
import time
import json
import re

LIMIT = 1000
OUTPUT_FILE = "artykuly_pilka_nozna.json"

SOURCES = [
    {
        "name": "Eurosport",
        "category_url": "https://eurosport.tvn24.pl/pilka-nozna",
        "article_pattern": re.compile(r'/pilka-nozna/.+_sto\d+/story\.shtml'),
        "subcategory_pattern": re.compile(r'^https://eurosport\.tvn24\.pl/pilka-nozna/[^/]+/$'),
        "base_url": "https://eurosport.tvn24.pl",
        "content_selectors": (
            ".flex.flex-col.gap-y-tk-space-rs-between-elements-xl h2, "
            "[class*='typo-tk-rs-body-md'][class*='wrap-anywhere']"
        ),
    },
    {
        "name": "Sport.pl",
        "category_url": "https://www.sport.pl/pilka/0,0.html",
        "article_pattern": re.compile(r'sport\.pl/pilka/7,\d+,\d+,[^#]+\.html$'),
        "subcategory_pattern": re.compile(r'^https://www\.sport\.pl/pilka/0,\d+\.html$'),
        "base_url": "https://www.sport.pl",
        "content_selectors": "section.art_content p",
    },
    {
        "name": "Sportowe Fakty",
        "category_url": "https://sportowefakty.wp.pl/pilka-nozna",
        "article_pattern": re.compile(r'sportowefakty\.wp\.pl/pilka-nozna/\d+/'),
        "subcategory_pattern": re.compile(r'^https://sportowefakty\.wp\.pl/pilka-nozna/[a-z][a-z-]+$'),
        "base_url": "https://sportowefakty.wp.pl",
        "content_selectors": ".article__lead p, .contentparts p",
    },
]


def is_promo(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return True
    return sum(1 for c in letters if c.isupper()) / len(letters) > 0.6


def clean_href(href):
    """Usuwa fragmenty (#...) z URL."""
    return href.split("#")[0]


def accept_cookies(page):
    for selector in ["button:has-text('Akceptuję')", "button:has-text('Zgadzam się')", "button:has-text('Akceptuj')"]:
        try:
            page.click(selector, timeout=3000)
            page.wait_for_timeout(1000)
            return
        except Exception:
            pass


def collect_links_from_page(page, url, source, links):
    """Scrolluje stronę i zbiera linki do artykułów."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
    except Exception as e:
        print(f"  Błąd ładowania {url}: {e}")
        return

    no_new_streak = 0
    while len(links) < LIMIT:
        for a in page.query_selector_all("a[href]"):
            href = clean_href(a.get_attribute("href") or "")
            if href.startswith("/"):
                href = source["base_url"] + href
            if source["article_pattern"].search(href):
                links.add(href)

        if len(links) >= LIMIT:
            break

        prev = len(links)

        clicked = False
        for text in ["Wczytaj więcej", "Załaduj więcej", "Pokaż więcej", "Load more"]:
            try:
                btn = page.query_selector(f"button:has-text('{text}')")
                if btn:
                    btn.scroll_into_view_if_needed()
                    btn.click()
                    page.wait_for_timeout(2000)
                    clicked = True
                    break
            except Exception:
                pass

        if not clicked:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)

        if len(links) == prev:
            no_new_streak += 1
            if no_new_streak >= 4:
                break
        else:
            no_new_streak = 0


def get_links_for_source(page, source):
    """Zbiera linki z głównej kategorii i podkategorii danego źródła."""
    links = set()

    print(f"\n[{source['name']}] Główna: {source['category_url']}")
    accept_cookies(page)
    collect_links_from_page(page, source["category_url"], source, links)
    print(f"  -> {len(links)} linków")

    if len(links) >= LIMIT:
        return links

    # Podkategorie
    try:
        page.goto(source["category_url"], wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
    except Exception:
        return links

    subcats = set()
    for a in page.query_selector_all("a[href]"):
        href = clean_href(a.get_attribute("href") or "")
        if href.startswith("/"):
            href = source["base_url"] + href
        if source["subcategory_pattern"].match(href) and href != source["category_url"]:
            subcats.add(href)

    print(f"  Znaleziono {len(subcats)} podkategorii")
    for i, subcat in enumerate(subcats, 1):
        if len(links) >= LIMIT:
            break
        print(f"  [{i}/{len(subcats)}] {subcat} ({len(links)} linków)")
        collect_links_from_page(page, subcat, source, links)

    return links


def scrape_article(page, url, source):
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)

        title_el = page.query_selector("h1")
        title = title_el.inner_text().strip() if title_el else "Brak tytułu"

        blocks = page.query_selector_all(source["content_selectors"])
        texts = [b.inner_text().strip().replace("\n", " ") for b in blocks]
        texts = [t for t in texts if len(t) > 30 and ">>>" not in t and not is_promo(t)]
        content = " ".join(texts)

        return {"url": url, "title": title, "content": content}
    except Exception as e:
        print(f"  Błąd: {e}")
        return None


def load_existing():
    articles = []
    for fname in [OUTPUT_FILE, "artykuly_eurosport-605.json"]:
        try:
            with open(fname, encoding="utf-8") as f:
                data = json.load(f)
            for a in data:
                if not any(x["url"] == a["url"] for x in articles):
                    articles.append(a)
        except Exception:
            pass
    return articles, {a["url"] for a in articles}


def save(articles):
    with open(OUTPUT_FILE, mode="w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)


def main():
    articles, already_scraped = load_existing()
    if already_scraped:
        print(f"Wznawiam — już pobrano {len(already_scraped)} artykułów.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        all_links = []
        for source in SOURCES:
            if len(all_links) >= LIMIT:
                break
            links = get_links_for_source(page, source)
            for link in links:
                all_links.append((link, source))
            print(f"  [{source['name']}] łącznie {len(links)} linków")

        new_links = [(url, src) for url, src in all_links if url not in already_scraped]
        print(f"\nDo pobrania: {len(new_links)} nowych artykułów (łącznie z obu źródeł)")

        for index, (link, source) in enumerate(new_links):
            print(f"({index+1}/{len(new_links)}) [{source['name']}] {link}")
            data = scrape_article(page, link, source)

            if data and data["content"]:
                articles.append(data)
                print(f"  -> '{data['title']}' ({len(data['content'])} znaków)")
            else:
                print(f"  -> pominięto")

            if (index + 1) % 10 == 0:
                save(articles)
                print(f"  [Zapisano {len(articles)} artykułów]")

            time.sleep(2)

        browser.close()

    save(articles)
    print(f"\nZakończono! Zapisano {len(articles)} artykułów w {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
