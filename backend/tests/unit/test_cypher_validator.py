import pytest

from db.cypher_validator import validate_cypher


@pytest.mark.parametrize(
    "query",
    [
        "MATCH (n) DETACH DELETE n",
        "match (n) delete n",
        "DROP INDEX x",
        "MATCH (n) REMOVE n.a",
        "CALL apoc.do.it()",
    ],
)
def test_dangerous_cypher_rejected(query):
    with pytest.raises(ValueError):
        validate_cypher(query)


def test_read_query_allowed():
    # A property whose name contains a keyword is not an operation.
    validate_cypher("MATCH (n) RETURN n.deleted_at, n.removed")
