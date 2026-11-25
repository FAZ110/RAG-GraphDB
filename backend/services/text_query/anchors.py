"""Entities of the space a question names, found before the model is asked, so it knows their
types and the links they really have instead of guessing them from the names."""

from db.access.scopes import SpaceScope
from db.graph.reads import entities_starting, entity_links
from services.text_query.words import MIN_WORD, same_word, words

MAX_ANCHORS = 6
MAX_LINKS = 12
_CANDIDATES = 2000


def _spans(question: list[str], name: str) -> list[tuple[int, int]]:
    parts = words(name)
    if not parts or len(name) < MIN_WORD:
        return []
    # A name of one word is matched only where the question writes it as a proper noun.
    return [
        (start, start + len(parts))
        for start in range(len(question) - len(parts) + 1)
        if all(same_word(question[start + i], w) for i, w in enumerate(parts))
        and (len(parts) > 1 or question[start][:1].isupper())
    ]


def find_in_question(question: str, candidates: list[dict]) -> list[dict]:
    """The candidates the question names, longest names first, each stretch of the question
    given to one entity only."""
    asked = words(question)
    found = []
    for entity in candidates:
        for name in [entity["name"], *entity.get("aliases", [])]:
            for start, end in _spans(asked, name):
                found.append((end - start, entity.get("degree", 0), start, end, entity))
    taken: set[int] = set()
    chosen: list[dict] = []
    for _, _, start, end, entity in sorted(found, key=lambda f: (-f[0], -f[1], f[2])):
        if taken & set(range(start, end)) or any(c["id"] == entity["id"] for c in chosen):
            continue
        taken |= set(range(start, end))
        chosen.append(entity)
    return chosen[:MAX_ANCHORS]


async def anchors(scope: SpaceScope, question: str) -> list[dict]:
    """The entities the question names, each with its type and its links to other entities."""
    prefixes = sorted({w.lower()[:MIN_WORD] for w in words(question) if len(w) >= MIN_WORD})
    if not prefixes:
        return []
    found = find_in_question(question, await entities_starting(scope, prefixes, _CANDIDATES))
    if not found:
        return []
    links = await entity_links(scope, [e["id"] for e in found])
    return [
        {"id": e["id"], "name": e["name"], "label": e["label"], "links": links.get(e["id"], [])}
        for e in found
    ]


def relation_types(found: list[dict]) -> set[str]:
    return {link["type"] for e in found for link in e["links"]}


def section(found: list[dict]) -> str:
    """The found entities as the model reads them: -[T]-> leaves the entity, <-[T]- reaches it."""
    lines = ["ENCJE Z PYTANIA znalezione w grafie (nazwa, typ i relacje, które naprawdę mają):"]
    for entity in found:
        links = ", ".join(
            f"-[{link['type']}]-> {link['label']} ({link['count']})"
            if link["out"]
            else f"<-[{link['type']}]- {link['label']} ({link['count']})"
            for link in entity["links"][:MAX_LINKS]
        )
        lines.append(f"- „{entity['name']}” ({entity['label']}): {links or 'brak relacji'}")
    return "\n".join(lines)
