from db.schema import ensure_schema
from tests.integration.conftest import cypher

_PAIR = "{space_id: 's1', a_label: 'OSOBA', a_name: 'Jan', b_label: 'OSOBA', b_name: 'Anna'}"


def test_startup_survives_a_constraint_the_data_breaks(client):
    cypher("DROP CONSTRAINT duplicate_suggestion_key")
    cypher(f"CREATE (:DuplicateSuggestion {_PAIR}), (:DuplicateSuggestion {_PAIR})")
    try:
        client.portal.call(ensure_schema)
        constraints = [r["name"] for r in cypher("SHOW CONSTRAINTS YIELD name")]
        assert "duplicate_suggestion_key" not in constraints
        assert "entity_key" in constraints
    finally:
        cypher("MATCH (s:DuplicateSuggestion) DELETE s")
        client.portal.call(ensure_schema)
    assert "duplicate_suggestion_key" in [r["name"] for r in cypher("SHOW CONSTRAINTS YIELD name")]
