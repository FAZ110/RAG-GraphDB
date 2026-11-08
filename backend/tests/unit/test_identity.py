from services.articles.identity import content_hash, normalize_url, source_key


def test_normalize_url_drops_tracking_and_trailing_slash():
    url = " HTTPS://Example.com/a/?utm_source=x&b=2&a=1&fbclid=z "
    assert normalize_url(url) == "https://example.com/a?a=1&b=2"


def test_normalize_url_without_host_is_empty():
    assert normalize_url("not a url") == ""


def test_content_hash_ignores_whitespace_reflow():
    assert content_hash("Ala  ma\n kota") == content_hash("Ala ma kota")


def test_content_hash_differs_for_different_text():
    assert content_hash("Ala ma kota") != content_hash("Ala ma psa")


def test_source_key_prefers_url():
    assert source_key("https://example.com/a/", "tekst") == "https://example.com/a"


def test_source_key_falls_back_to_content_hash():
    assert source_key("", "tekst") == f"sha256:{content_hash('tekst')}"
