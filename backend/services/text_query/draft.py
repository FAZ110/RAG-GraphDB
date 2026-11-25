"""The model's answer, a pattern with entity names where ids go: checked against the space's
schema and the pattern's own rules, then turned into a pattern the graph can run."""

from pydantic import ValidationError

from schemas.query import GraphPattern
from services.text_query.words import fold, same_word, words

_EDGE_DEFAULTS = {"direction": "any", "max_hops": 1, "mode": "required", "via": "relation"}
_AUXILIARIES = {"jest", "byl", "byla", "jako"}
_PREPOSITIONS = {"w", "we", "z", "ze", "do", "dla", "na", "o", "od", "po", "przy"}


def _present(values: dict) -> dict:
    return {k: v for k, v in values.items() if v is not None}


def _nodes(answer: dict) -> list[dict]:
    return [n for n in answer.get("nodes") or [] if isinstance(n, dict)]


def _edges(answer: dict) -> list[dict]:
    return [e for e in answer.get("edges") or [] if isinstance(e, dict)]


def _is_known(node: dict) -> bool:
    return bool(node.get("names"))


def names_of(answer: dict) -> list[str]:
    """Every entity name the answer asks about, once each, in order."""
    seen: dict[str, None] = {}
    for node in _nodes(answer):
        for name in node.get("names") or []:
            if isinstance(name, str) and name.strip():
                seen.setdefault(name.strip(), None)
    return list(seen)


def _sought(node: dict) -> dict:
    link_count = node.get("link_count")
    return _present(
        {
            "key": node.get("key"),
            "label": node.get("label"),
            "name_contains": node.get("name_contains") or None,
            "link_count": _present(link_count) if isinstance(link_count, dict) else None,
        }
    )


def _edge(edge: dict) -> dict:
    values = {**_EDGE_DEFAULTS, **_present(edge)}
    return {
        "source": values.get("source"),
        "target": values.get("target"),
        **_present({"type": values.get("type")}),
        "direction": values["direction"],
        "min_hops": 1,
        "max_hops": values["max_hops"],
        "mode": values["mode"],
        "via": values["via"],
    }


def _body(answer: dict, ids_of) -> dict:
    nodes = []
    for node in _nodes(answer):
        if not _is_known(node):
            nodes.append(_sought(node))
            continue
        ids = ids_of(node)
        if ids:
            at_least = node.get("at_least")
            at_least = min(at_least, len(ids)) if isinstance(at_least, int) else None
            nodes.append(
                _present({"key": node["key"], "ids": ids, "at_least": at_least})
                if at_least and at_least >= 2
                else {"key": node["key"], "ids": ids}
            )
    keys = {n.get("key") for n in nodes}
    edges = [
        _edge(e) for e in _edges(answer) if e.get("source") in keys and e.get("target") in keys
    ]
    return {"nodes": nodes, "edges": edges}


def _placeholder_ids(node: dict) -> list[str]:
    names = [n for n in node.get("names") or [] if isinstance(n, str) and n.strip()]
    return [f"{node.get('key')}-{i}" for i in range(len(names))]


def _schema_problems(answer: dict, schema: dict) -> list[str]:
    labels = {row["label"] for row in schema["labels"]}
    types = {row["type"] for row in schema["relations"]}
    problems = []

    def label(value, where: str) -> None:
        if value is not None and value not in labels:
            problems.append(f"{where}: typ encji „{value}” nie występuje w SCHEMACIE")

    def type(value, where: str) -> None:
        if value is not None and value not in types:
            problems.append(f"{where}: typ relacji „{value}” nie występuje w SCHEMACIE")

    for node in _nodes(answer):
        where = f"węzeł {node.get('key')}"
        if _is_known(node):
            if not _placeholder_ids(node):
                problems.append(f"{where}: węzeł znany musi mieć co najmniej jedną nazwę")
            continue
        label(node.get("label"), where)
        if isinstance(link_count := node.get("link_count"), dict):
            label(link_count.get("label"), f"{where}, link_count")
            type(link_count.get("type"), f"{where}, link_count")
    for edge in _edges(answer):
        type(edge.get("type"), f"połączenie {edge.get('source')}–{edge.get('target')}")
    return problems


def _pattern_problems(answer: dict) -> list[str]:
    try:
        GraphPattern.model_validate(_body(answer, _placeholder_ids))
    except ValidationError as e:
        return [_describe(error) for error in e.errors()]
    return []


def _describe(error: dict) -> str:
    message = error["msg"].removeprefix("Value error, ")
    where = ".".join(str(part) for part in error["loc"])
    return f"{where}: {message}" if where else message


def problems(answer: dict, schema: dict) -> list[str]:
    """What keeps the answer from being a pattern of this space; empty when it is one."""
    if not isinstance(answer.get("nodes"), list) or not isinstance(answer.get("edges", []), list):
        return ['Odpowiedź musi być obiektem {"nodes": [...], "edges": [...]}']
    return _schema_problems(answer, schema) + _pattern_problems(answer)


def without_unknown_types(answer: dict, schema: dict) -> dict:
    """The answer with types the space lacks left open, the last resort after the retries."""
    labels = {row["label"] for row in schema["labels"]}
    types = {row["type"] for row in schema["relations"]}

    def node(n: dict) -> dict:
        if _is_known(n):
            return n
        fixed = {**n, "label": n.get("label") if n.get("label") in labels else None}
        if isinstance(link_count := n.get("link_count"), dict):
            fixed["link_count"] = {
                **link_count,
                "label": link_count.get("label") if link_count.get("label") in labels else None,
                "type": link_count.get("type") if link_count.get("type") in types else None,
            }
        return fixed

    def edge(e: dict) -> dict:
        return {**e, "type": e.get("type") if e.get("type") in types else None}

    return {"nodes": [node(n) for n in _nodes(answer)], "edges": [edge(e) for e in _edges(answer)]}


def to_pattern(answer: dict, ids_by_name: dict[str, str]) -> tuple[dict, list[str]]:
    """The pattern with each name replaced by its entity's id, and the names no entity has.
    A known node none of whose names was found is left out, with its links."""

    def ids_of(node: dict) -> list[str]:
        ids = [ids_by_name.get(name.strip()) for name in node.get("names") or []]
        return list(dict.fromkeys(i for i in ids if i))

    missing = [name for name in names_of(answer) if name not in ids_by_name]
    return _body(answer, ids_of), missing


def _split(type: str) -> tuple[list[str], set[str]]:
    """A type's content words and its prepositions, auxiliaries left out."""
    parts = [w for w in words(type.replace("_", " ")) if fold(w) not in _AUXILIARIES]
    content = [w for w in parts if fold(w) not in _PREPOSITIONS]
    return content or parts, {fold(w) for w in parts if fold(w) in _PREPOSITIONS}


def _twins(a: str, b: str) -> bool:
    """One relation written two ways: PRZEWODNICZYŁ and PRZEWODNICZY_W, JEST_PREZESEM and
    PREZES. A preposition each, unlike, makes them two: STRZELIŁ_GOLA_W and STRZELIŁ_GOLA_DLA."""
    (x, x_preps), (y, y_preps) = _split(a), _split(b)
    if a == b or len(x) != len(y) or (x_preps and y_preps and x_preps != y_preps):
        return False
    return all(same_word(p, q) for p, q in zip(x, y, strict=True))


def _has_twin(type: str | None, types: set[str]) -> bool:
    return type is not None and any(_twins(type, other) for other in types)


def without_spelling_twins(answer: dict, schema: dict) -> dict:
    """The answer with any relationship type that has a twin spelt nearly the same left open:
    extraction writes one relation two ways, JEST_CZŁONKIEM_ZARZĄDU and JEST_CZŁONEM_ZARZĄDU,
    and picking one of them would miss the entities linked by the other."""
    types = {row["type"] for row in schema["relations"]}

    def node(n: dict) -> dict:
        link_count = n.get("link_count")
        if isinstance(link_count, dict) and _has_twin(link_count.get("type"), types):
            return {**n, "link_count": {**link_count, "type": None}}
        return n

    def edge(e: dict) -> dict:
        return {**e, "type": None} if _has_twin(e.get("type"), types) else e

    return {
        **answer,
        "nodes": [node(n) for n in _nodes(answer)],
        "edges": [edge(e) for e in _edges(answer)],
    }
