"""The JSON schema the answer must follow, for providers that constrain decoding to one: the
model then cannot name a type the space lacks or leave the format."""

from schemas.query import MAX_HOPS

MAX_KEYS = 6
KEYS = [f"{prefix}{i}" for prefix in ("k", "x") for i in range(1, MAX_KEYS + 1)]


def _nullable(kind: str) -> dict:
    return {"type": [kind, "null"]}


def _one_of(values: list[str]) -> dict:
    return {"type": ["string", "null"], "enum": [*values, None]}


def _object(properties: dict, nullable: bool = False) -> dict:
    return {
        "type": ["object", "null"] if nullable else "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


def response_format(labels: list[str], types: list[str]) -> dict:
    """The answer's schema with the space's entity and relation types as the only ones allowed."""
    label, type = {"$ref": "#/$defs/label"}, {"$ref": "#/$defs/type"}
    key = {"$ref": "#/$defs/key"}
    node = _object(
        {
            "key": key,
            "names": {"type": ["array", "null"], "items": {"type": "string"}},
            "at_least": _nullable("integer"),
            "label": label,
            "name_contains": _nullable("string"),
            "link_count": _object(
                {"min": {"type": "integer"}, "type": type, "label": label}, nullable=True
            ),
        }
    )
    edge = _object(
        {
            "source": key,
            "target": key,
            "type": type,
            "direction": {"type": "string", "enum": ["out", "in", "any"]},
            "max_hops": {"type": "integer", "enum": list(range(1, MAX_HOPS + 1))},
            "mode": {"type": "string", "enum": ["required", "optional", "not"]},
            "via": {"type": "string", "enum": ["relation", "articles"]},
        }
    )
    answer = _object(
        {
            "nodes": {"type": "array", "items": node},
            "edges": {"type": "array", "items": edge},
            "error": _nullable("string"),
        }
    )
    answer["$defs"] = {
        "label": _one_of(sorted(set(labels))),
        "type": _one_of(sorted(set(types))),
        "key": {"type": "string", "enum": KEYS},
    }
    return {
        "type": "json_schema",
        "json_schema": {"name": "graph_pattern", "strict": True, "schema": answer},
    }
