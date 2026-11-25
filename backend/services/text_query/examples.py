"""Worked examples for the prompt, kept as data so a test can check each one passes the checks
the model's own answers go through."""

SPORT = {
    "labels": ["ZAWODNIK", "KLUB", "TRENER", "LIGA"],
    "relations": [
        ("ZAWODNIK", "GRA_W", "KLUB"),
        ("ZAWODNIK", "ZNA", "ZAWODNIK"),
        ("KLUB", "RYWAL", "KLUB"),
        ("TRENER", "PROWADZI", "KLUB"),
        ("KLUB", "GRA_W_LIDZE", "LIGA"),
        ("KLUB", "UCZESTNICZY_W", "LIGA"),
    ],
}

BUSINESS = {
    "labels": ["OSOBA", "FIRMA", "ORGAN", "MIASTO", "FUNDUSZ"],
    "relations": [
        ("OSOBA", "PRACUJE_W", "FIRMA"),
        ("FUNDUSZ", "MA_UDZIAŁY_W", "FIRMA"),
        ("OSOBA", "ZASIADA_W", "ORGAN"),
        ("FIRMA", "PRZEJĘŁA", "FIRMA"),
        ("FIRMA", "MA_SIEDZIBĘ_W", "MIASTO"),
    ],
}


def known(key: str, *names: str, at_least: int | None = None) -> dict:
    return {"key": key, "names": list(names), "at_least": at_least}


def sought(
    key: str,
    label: str | None = None,
    name_contains: str | None = None,
    link_count: dict | None = None,
) -> dict:
    return {"key": key, "label": label, "name_contains": name_contains, "link_count": link_count}


def link(
    source: str,
    target: str,
    type: str | None = None,
    direction: str = "out",
    max_hops: int = 1,
    mode: str = "required",
    via: str = "relation",
) -> dict:
    return {
        "source": source,
        "target": target,
        "type": type,
        "direction": direction,
        "max_hops": max_hops,
        "mode": mode,
        "via": via,
    }


def together(source: str, target: str) -> dict:
    return link(source, target, direction="any", via="articles")


EXAMPLES: list[tuple[dict, str, dict]] = [
    (
        SPORT,
        "Którzy zawodnicy grają w Lechu Poznań?",
        {
            "nodes": [known("k1", "Lech Poznań"), sought("x1", "ZAWODNIK")],
            "edges": [link("x1", "k1", "GRA_W")],
        },
    ),
    (
        SPORT,
        "Kto grał zarówno w Legii, jak i w Wiśle Kraków?",
        {
            "nodes": [known("k1", "Legia", "Wisła Kraków", at_least=2), sought("x1")],
            "edges": [link("x1", "k1", "GRA_W")],
        },
    ),
    (
        SPORT,
        "Zawodnicy Lecha, którzy nigdy nie grali w Legii",
        {
            "nodes": [known("k1", "Lech"), known("k2", "Legia"), sought("x1", "ZAWODNIK")],
            "edges": [link("x1", "k1", "GRA_W"), link("x1", "k2", "GRA_W", mode="not")],
        },
    ),
    (
        SPORT,
        "Kto prowadzi kluby, które rywalizują z Rakowem?",
        {
            "nodes": [known("k1", "Raków"), sought("x1", "KLUB"), sought("x2", "TRENER")],
            "edges": [
                link("k1", "x1", "RYWAL", direction="any"),
                link("x1", "x2", "PROWADZI", direction="in"),
            ],
        },
    ),
    (
        SPORT,
        "Z kim Raków dzieli ligę?",
        {
            "nodes": [known("k1", "Raków"), sought("x1", "LIGA"), sought("x2", "KLUB")],
            "edges": [link("k1", "x1"), link("x2", "x1")],
        },
    ),
    (
        SPORT,
        "Kluby, w których grało co najmniej pięciu zawodników",
        {
            "nodes": [
                sought(
                    "x1",
                    "KLUB",
                    link_count={"min": 5, "type": "GRA_W", "label": "ZAWODNIK"},
                )
            ],
            "edges": [],
        },
    ),
    (
        SPORT,
        "Z czym pośrednio, najwyżej przez dwa kroki, wiąże się Robert Lewandowski?",
        {
            "nodes": [known("k1", "Robert Lewandowski"), sought("x1")],
            "edges": [link("k1", "x1", direction="any", max_hops=2)],
        },
    ),
    (
        BUSINESS,
        "Jakie firmy pojawiają się w artykułach razem z Orlenem i zostały przez kogoś przejęte?",
        {
            "nodes": [known("k1", "Orlen"), sought("x1", "FIRMA"), sought("x2", "FIRMA")],
            "edges": [together("x1", "k1"), link("x2", "x1", "PRZEJĘŁA")],
        },
    ),
    (
        BUSINESS,
        "Pracownicy PKN Orlen, a jeśli zasiadają w jakimś organie, to także ten organ",
        {
            "nodes": [known("k1", "PKN Orlen"), sought("x1", "OSOBA"), sought("x2", "ORGAN")],
            "edges": [
                link("x1", "k1", "PRACUJE_W"),
                link("x1", "x2", "ZASIADA_W", mode="optional"),
            ],
        },
    ),
    (
        BUSINESS,
        "Kto kupił firmy, w które wcześniej zainwestował fundusz Baltic Ventures?",
        {
            "nodes": [
                known("k1", "Baltic Ventures"),
                sought("x1", "FIRMA"),
                sought("x2", "FIRMA"),
            ],
            "edges": [link("k1", "x1", "MA_UDZIAŁY_W"), link("x2", "x1", "PRZEJĘŁA")],
        },
    ),
    (
        BUSINESS,
        "Kto pracuje w tej samej firmie co Jan Kowalski?",
        {
            "nodes": [known("k1", "Jan Kowalski"), sought("x1", "FIRMA"), sought("x2", "OSOBA")],
            "edges": [link("k1", "x1", "PRACUJE_W"), link("x2", "x1", "PRACUJE_W")],
        },
    ),
    (
        BUSINESS,
        "Firmy z siedzibą w Płocku, które mają „Energia” w nazwie",
        {
            "nodes": [known("k1", "Płock"), sought("x1", "FIRMA", name_contains="Energia")],
            "edges": [link("x1", "k1", "MA_SIEDZIBĘ_W")],
        },
    ),
    (
        BUSINESS,
        "Ile zarobił prezes Orlenu w 2023 roku?",
        {
            "error": "Graf nie zawiera kwot ani dat. Możesz zapytać na przykład, kto pracuje "
            "w Orlenie albo w jakich organach zasiadają jego pracownicy."
        },
    ),
]

# What the app found in the graph for an example's question, shown to the model with it.
FOUND = {
    "Kto kupił firmy, w które wcześniej zainwestował fundusz Baltic Ventures?": [
        {
            "name": "Baltic Ventures",
            "label": "FUNDUSZ",
            "links": [{"type": "MA_UDZIAŁY_W", "out": True, "label": "FIRMA", "count": 3}],
        }
    ],
}
