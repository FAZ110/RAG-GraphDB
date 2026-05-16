import re

_DANGEROUS_CYPHER = re.compile(
    r"\b(DETACH\s+DELETE|DELETE|DROP|REMOVE|CALL\s+apoc\.)\b",
    re.IGNORECASE,
)


def validate_cypher(cypher: str) -> None:
    match = _DANGEROUS_CYPHER.search(cypher)
    if match:
        raise ValueError(f"Dangerous cypher operation: '{match.group()}'")
