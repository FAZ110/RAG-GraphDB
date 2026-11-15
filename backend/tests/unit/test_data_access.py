import re
from pathlib import Path

import pytest
from neo4j import Record

from db.access.guard import ScopeError, bind, checked_rows
from db.access.queries import Query, load_queries
from db.access.scopes import SYSTEM, SpaceScope, UserScope

BACKEND = Path(__file__).parents[2]
SPACE = SpaceScope(space_id="s1", owner_id="u1")
USER = UserScope(user_id="u1")


def query(kind: str, text: str = "RETURN 1") -> Query:
    return Query(name="q", kind=kind, text=text)


def write_cypher(tmp_path: Path, text: str) -> str:
    (tmp_path / "queries.cypher").write_text(text, encoding="utf-8")
    return str(tmp_path / "queries.py")


@pytest.mark.parametrize(
    ("scope", "kind"),
    [(USER, "space"), (USER, "admin"), (SPACE, "admin"), (SPACE, "system"), (SYSTEM, "space")],
)
def test_scope_runs_only_its_kinds_of_query(scope, kind):
    with pytest.raises(ScopeError):
        bind(scope, query(kind), {})


def test_space_scope_also_runs_its_owners_queries():
    assert bind(SPACE, query("owner"), {}) == {"space_id": "s1", "owner_id": "u1"}


@pytest.mark.parametrize("key", ["space_id", "owner_id"])
def test_caller_cannot_set_what_the_scope_sets(key):
    with pytest.raises(ScopeError):
        bind(SPACE, query("space"), {key: "someone-elses"})


def test_scope_params_are_added_to_the_callers():
    assert bind(USER, query("owner"), {"limit": 5}) == {"limit": 5, "owner_id": "u1"}


@pytest.mark.parametrize(
    "row",
    [
        {"space_id": "s2"},
        {"props": {"name": "X", "space_id": "s2"}},
        {"nodes": [{"props": {"space_id": "s1"}}, {"props": {"space_id": "s2"}}]},
    ],
)
def test_rows_of_another_space_are_refused(row):
    with pytest.raises(ScopeError):
        checked_rows(SPACE, query("space"), [Record(row)])


def test_rows_of_own_space_pass():
    rows = [Record({"props": {"space_id": "s1"}, "embedding": [0.1, 0.2]})]
    assert checked_rows(SPACE, query("space"), rows) == rows


def test_owner_rows_may_span_the_owners_spaces():
    rows = [Record({"space_id": "s2"})]
    assert checked_rows(SPACE, query("owner"), rows) == rows


def test_query_without_scope_line_stops_loading(tmp_path):
    with pytest.raises(ValueError, match="scope"):
        load_queries(write_cypher(tmp_path, "// name: a\nMATCH (n) RETURN n\n"))


def test_space_query_not_filtering_by_space_stops_loading(tmp_path):
    text = "// name: a\n// scope: space\nMATCH (n {space_id: $space_ids}) RETURN n\n"
    with pytest.raises(ValueError, match=r"\$space_id"):
        load_queries(write_cypher(tmp_path, text))


def test_unknown_scope_stops_loading(tmp_path):
    with pytest.raises(ValueError, match="unknown scope"):
        load_queries(write_cypher(tmp_path, "// name: a\n// scope: anyone\nRETURN 1\n"))


def test_numbers_fill_placeholders_only_as_integers():
    filled = query("space", "MATCH p = SHORTEST {k} (a)-[]-{1,{n}}(b)").with_numbers(k="3", n=2)
    assert filled.text == "MATCH p = SHORTEST 3 (a)-[]-{1,2}(b)"
    with pytest.raises(ValueError):
        query("space", "{k}").with_numbers(k="1) DETACH DELETE (n")


# Where each scope may be made: right after the check it stands for.
_MADE_IN = {
    "SpaceScope": {"db/access/scopes.py", "db/spaces/spaces.py", "tasks/extract_task.py"},
    "UserScope": {"db/access/scopes.py", "api/dependencies.py"},
    "AdminScope": {"api/dependencies.py", "create_admin.py"},
    "SystemScope": {"db/access/scopes.py"},
}


def test_scopes_are_made_only_where_access_is_checked():
    made = {}
    for path in BACKEND.rglob("*.py"):
        rel = path.relative_to(BACKEND).as_posix()
        if rel.startswith(("venv/", "tests/")):
            continue
        for name in re.findall(
            r"\b(SpaceScope|UserScope|AdminScope|SystemScope)\(", path.read_text()
        ):
            made.setdefault(name, set()).add(rel)
    stray = {name: files - _MADE_IN[name] for name, files in made.items() if files - _MADE_IN[name]}
    assert not stray
