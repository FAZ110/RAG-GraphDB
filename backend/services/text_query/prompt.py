import json

from services.text_query.anchors import section
from services.text_query.examples import EXAMPLES, FOUND

MAX_LABELS = 30
MAX_RELATIONS = 50
# Narrower views of the schema, tried in turn while a request is over MAX_REQUEST_CHARS.
CAPS = [(MAX_LABELS, MAX_RELATIONS), (20, 30), (12, 15)]
# About 7000 tokens of Polish: within a free Groq tier's 8000 tokens a minute.
MAX_REQUEST_CHARS = 15_000

_INSTRUCTIONS = """\
Jesteś tłumaczem pytań na zapytania do grafu wiedzy. Zamieniasz pytanie zadane po polsku na \
wzorzec: mały graf z encji znanych (nazwanych w pytaniu), encji szukanych (tych, o które \
pytanie pyta) i połączeń między nimi. Nie odpowiadasz na pytanie. Opisujesz tylko, czego \
szukać, a wzorzec zostanie wykonany na grafie jednej przestrzeni.

# Jak zbudowany jest graf
- Encja ma nazwę i typ, np. „Lech Poznań” typu KLUB. Typy powstały przy ekstrakcji \
i w każdej przestrzeni są inne. Dostępne typy podaje SCHEMAT w wiadomości użytkownika.
- Relacja łączy dwie encje, ma typ i kierunek od źródła do celu: ZAWODNIK -[GRA_W]-> KLUB \
czyta się „zawodnik gra w klubie”.
- Artykuły wspominają encje. Dwie encje „wspomniane razem” występują w tym samym artykule, \
nawet gdy nie łączy ich żadna relacja.

# Format odpowiedzi
Zwróć wyłącznie jeden obiekt JSON, bez markdown i bez komentarzy:
{"nodes": [...], "edges": [...], "error": null}
Gdy pytania nie da się wyrazić wzorcem, zwróć puste listy i wyjaśnienie:
{"nodes": [], "edges": [], "error": "jedno lub dwa zdania po polsku: czego nie da się zapytać \
i jak przeformułować pytanie"}

Każdy węzeł ma wszystkie pola: znany ma label, name_contains i link_count równe null, \
a szukany ma names i at_least równe null.

## Węzeł znany: encje nazwane w pytaniu
{"key": "k1", "names": ["Lech Poznań"], "at_least": null}
- names: nazwy w mianowniku, w brzmieniu z pytania: „w Lechu Poznań” → „Lech Poznań”, \
„z Legią” → „Legia”. Nie rozwijaj skrótów i nie poprawiaj nazw. Kilka nazw w jednym węźle \
znaczy „którakolwiek z nich”.
- at_least: liczba od 2 do liczby nazw, gdy szukana encja ma być połączona z co najmniej \
tyloma z nich: „zarówno w A, jak i w B” → 2, „w co najmniej dwóch z A, B, C” → 2. \
W przeciwnym razie null.

## Węzeł szukany: to, o co pytanie pyta
{"key": "x1", "label": "ZAWODNIK", "name_contains": null, "link_count": null}
- label: typ encji ze SCHEMATU. Null, gdy pytanie nie mówi, jakiego rodzaju encji szuka \
(„kto”, „co”, „z czym”), albo gdy żaden typ nie pasuje.
- name_contains: fragment nazwy, gdy pytanie go podaje („z »Wisła« w nazwie”), inaczej null.
- link_count: {"min": N, "type": TYP_RELACJI lub null, "label": TYP_ENCJI lub null}, gdy \
pytanie liczy powiązania szukanej encji: „grał w co najmniej 3 klubach” → \
{"min": 3, "type": "GRA_W", "label": "KLUB"}. To warunek na samą encję: nie dodawaj dla \
niego osobnych węzłów. W przeciwnym razie null.

## Połączenie
{"source": "x1", "target": "k1", "type": "GRA_W", "direction": "out", "max_hops": 1, \
"mode": "required", "via": "relation"}
- type: typ relacji ze SCHEMATU. Null, gdy pasuje każda relacja („związany z”, \
„powiązany z”) albo gdy kilka typów pasuje równie dobrze.
- direction: kierunek relacji widziany od source. "out": relacja biegnie od source do \
target. "in": od target do source. "any": kierunek nie ma znaczenia. Kierunek odczytuj ze \
SCHEMATU, nie z szyku zdania. Jeśli w SCHEMACIE jest TRENER -[PROWADZI]-> KLUB, to \
połączenie od klubu do trenera ma direction "in".
- max_hops: 1, gdy encje łączy jedna relacja. 2 albo 3 tylko wtedy, gdy pytanie mówi \
„pośrednio”, „przez kogoś”, „w dwóch krokach” i nie mówi, przez co. Dłuższa ścieżka może \
przechodzić przez dowolne encje, więc nigdy nie zastępuj nią encji, którą pytanie nazywa.
- mode: "required", gdy połączenie musi istnieć. "not", gdy nie może istnieć („nie grał \
w”, „bez”, „nigdy”). "optional", gdy pytanie chce je dołączyć tylko wtedy, gdy istnieje \
(„a jeśli”, „ewentualnie”, „o ile”).
- via: "relation" dla relacji w grafie. "articles" dla encji wspomnianych razem w jednym \
artykule („pojawiają się razem”, „wspominani w tym samym tekście”, „w kontekście”). \
Przy "articles": type null, direction "any", max_hops 1.

# Zasady
1. Każda encja nazwana w pytaniu nazwą własną to węzeł znany. To, o co pytanie pyta, to \
węzeł szukany. Wzorzec musi mieć co najmniej jeden węzeł szukany.
2. Gdy wiadomość ma sekcję ENCJE Z PYTANIA, te encje na pewno są w grafie. Wpisz w names \
ich nazwy dokładnie stamtąd, a relacje z nimi wybieraj spośród tych, które tam mają: \
-[TYP]-> wychodzi z encji, <-[TYP]- do niej wchodzi. Pozostałe nazwy z pytania traktuj jak \
zwykle.
3. Używaj tylko typów encji i relacji obecnych w SCHEMACIE, zapisanych dokładnie tak jak \
tam. Nie tłumacz ich, nie odmieniaj i nie wymyślaj nowych. Typ dobieraj po znaczeniu, nie po \
brzmieniu: nazwy nadała ekstrakcja, więc „inwestował w” może być w SCHEMACIE relacją \
MA_UDZIAŁY_W, a „szef” typem PREZES. Gdy żaden typ nie oddaje sensu, wpisz null, czyli \
„dowolna relacja”.
4. Typ relacji dobieraj po parach typów, które łączy w SCHEMACIE. Gdy tę samą parę typów \
łączy kilka typów relacji (np. KLUB -[GRA_W_LIDZE]-> LIGA i KLUB -[UCZESTNICZY_W]-> LIGA), \
a pytanie nie wskazuje jednego z nich, wpisz type null i zostaw kierunek. To synonimy \
z ekstrakcji, a wybór jednego zgubiłby część wyników.
5. Połączenia "required" muszą spinać wszystkie pozostałe węzły w jedną całość. \
Połączenie "optional" prowadzi do osobnego węzła szukanego, który nie ma innych połączeń. \
Połączenie "not" łączy węzeł szukany z tej całości z encją, której ma przy nim nie być.
6. Gdy pytanie mówi o czymś wspólnym („w tej samej lidze co”, „ten sam klub”, „wspólny \
trener”, „pracują w tej samej firmie”), ta wspólna rzecz jest osobnym węzłem szukanym ze \
swoim typem, a obie strony łączą się z nią. Nie zastępuj jej połączeniem przez max_hops.
7. Encja szukana nigdy nie jest żadną z encji znanych, więc „inne niż”, „poza nim”, \
„oprócz” nie wymagają osobnego warunku.
8. Najwyżej 6 węzłów i 8 połączeń. Klucze: k1, k2… dla znanych, x1, x2… dla szukanych.
9. Nie dodawaj warunków, o które pytanie nie prosi. Najprostszy wzorzec, który oddaje \
sens pytania, jest najlepszy.
10. Wypełnij "error" tylko wtedy, gdy pytanie dotyczy dat, kolejności zdarzeń, kwot, \
statystyk innych niż liczba powiązań, treści artykułów albo opinii, albo gdy w ogóle nie \
dotyczy grafu. Zaproponuj wtedy pytanie, które da się zadać. Brak typu relacji o pasującej \
nazwie nigdy nie jest powodem odmowy: użyj typu o tym samym znaczeniu albo null.

# Przykłady
Przykłady korzystają z przykładowych schematów. W odpowiedzi używaj wyłącznie SCHEMATU \
z wiadomości użytkownika. Dla zwięzłości przykłady pomijają pola równe null i wartości \
domyślne (max_hops 1, mode "required", via "relation", error null). W odpowiedzi wpisuj \
wszystkie pola.
"""


def _compact(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _relation_line(source: str, type: str, target: str) -> str:
    return f"{source} -[{type}]-> {target}"


_DEFAULTS = {"max_hops": 1, "mode": "required", "via": "relation"}


def _short(item: dict) -> dict:
    return {k: v for k, v in item.items() if v is not None and _DEFAULTS.get(k) != v}


def _as_shown(answer: dict) -> dict:
    if "error" in answer:
        return {"nodes": [], "edges": [], "error": answer["error"]}
    return {
        "nodes": [_short(n) for n in answer["nodes"]],
        "edges": [_short(e) for e in answer["edges"]],
    }


def _examples() -> str:
    """The examples under the schema they use, each schema written once."""
    groups: dict[str, list[str]] = {}
    for schema, question, answer in EXAMPLES:
        relations = ", ".join(_relation_line(*r) for r in schema["relations"])
        heading = f"Schemat: typy {', '.join(schema['labels'])}; relacje {relations}"
        found = f"{section(FOUND[question])}\n" if question in FOUND else ""
        groups.setdefault(heading, []).append(
            f"{found}Pytanie: {question}\nOdpowiedź: {_compact(_as_shown(answer))}"
        )
    return "\n\n".join(f"{heading}\n\n" + "\n\n".join(items) for heading, items in groups.items())


SYSTEM_PROMPT = f"{_INSTRUCTIONS}\n{_examples()}\n"


def schema_section(schema: dict, caps: tuple[int, int] = CAPS[0]) -> str:
    """The space's types and relations, most common first, as the model is to read them."""
    labels = schema["labels"][: caps[0]]
    relations = schema["relations"][: caps[1]]
    lines = ["SCHEMAT tej przestrzeni", "", "Typy encji (liczba encji):"]
    lines += [f"- {row['label']} ({row['count']})" for row in labels]
    if hidden := len(schema["labels"]) - len(labels):
        lines.append(f"- … i {hidden} rzadszych typów")
    lines += ["", "Relacje (źródło -[TYP]-> cel, liczba połączeń):"]
    lines += [
        f"- {_relation_line(row['source'], row['type'], row['target'])} ({row['count']})"
        for row in relations
    ]
    if hidden := len(schema["relations"]) - len(relations):
        lines.append(f"- … i {hidden} rzadszych relacji")
    if not relations:
        lines.append("- brak relacji: łącz encje tylko przez wspólne artykuły")
    return "\n".join(lines)


def messages(
    schema: dict,
    question: str,
    found: list[dict] | None = None,
    caps: tuple[int, int] = CAPS[0],
) -> list[dict]:
    parts = [
        schema_section(schema, caps),
        *([section(found)] if found else []),
        f"Pytanie: {question}",
    ]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n\n".join(parts)},
    ]


def repair(answer: dict, problems: list[str]) -> list[dict]:
    """The model's answer and what is wrong with it, for the next try."""
    listed = "\n".join(f"- {p}" for p in problems)
    return [
        {"role": "assistant", "content": _compact(answer)},
        {
            "role": "user",
            "content": "Ten wzorzec nie przechodzi sprawdzenia:\n"
            f"{listed}\n"
            "Popraw go zgodnie z zasadami i zwróć cały poprawiony JSON.",
        },
    ]
