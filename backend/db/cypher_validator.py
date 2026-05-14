import re
from fastapi import HTTPException

_DANGEROUS_CYPHER = re.compile(
    r"\b(DETACH\s+DELETE|DELETE|DROP|REMOVE|CALL\s+apoc\.)\b",
    re.IGNORECASE,
)


def validate_cypher(cypher: str) -> None:
    match = _DANGEROUS_CYPHER.search(cypher)
    if match:
        raise HTTPException(
            status_code=422,
            detail=f"Wygenerowany kod Cypher zawiera niedozwoloną operację: '{match.group()}'",
        )
