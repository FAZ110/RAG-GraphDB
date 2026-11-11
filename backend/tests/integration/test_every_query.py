"""Every query of a user's data, picked up on its own: run in Alice's scope with Bob's ids it
must neither return nor change anything of Bob's, and its plan must use an index. A new query
needs sample parameters here."""

import importlib
import json
import re

import pytest
from neo4j.exceptions import Neo4jError

from db.access.guard import bind
from db.access.queries import Query
from db.access.scopes import SpaceScope, UserScope
from db.driver import get_sync_driver
from tests.integration.conftest import cypher
from tests.integration.sample_graph import ARTICLE_A, ARTICLE_B

_MODULES = (
    "db.analyses.analyses",
    "db.graph.edits",
    "db.graph.explore",
    "db.graph.reads",
    "db.graph.writer",
    "db.home",
    "db.settings",
    "db.spaces.articles",
    "db.spaces.batches",
    "db.spaces.spaces",
    "db.spaces.stats",
    "db.users",
    "tasks.extract_task",
)
_BOBS_ONLY = "Bobowo"
_FULL_SCANS = {
    "AllNodesScan",
    "NodeByLabelScan",
    "DirectedAllRelationshipsScan",
    "UndirectedAllRelationshipsScan",
    "DirectedRelationshipTypeScan",
    "UndirectedRelationshipTypeScan",
}
# Queries that create a node take its new id from the app, never from the request.
_FRESH = {
    "create_analysis": {"analysis_id": "new-analysis"},
    "create_custom_provider": {"id": "new-provider"},
    "create_entity": {"name": "Nowy"},
    "create_space": {"space_id": "new-space", "name": "Nowa"},
}


def _user_queries() -> list[Query]:
    queries = []
    for name in _MODULES:
        for query in importlib.import_module(name)._QUERIES.values():
            if query.kind in ("space", "owner"):
                queries.append(query.with_numbers(k=5, max_length=3))
    return queries


def _sample_params(bob: dict) -> dict:
    """What an attacker in their own scope would send: Bob's ids wherever an id goes."""
    vec = [0.5] * 8
    return {
        "a_label": "OSOBA", "a_name": "Jan", "b_label": "OSOBA", "b_name": _BOBS_ONLY,
        "aliases": [], "analysis_id": bob["analysis"], "analysis_ids": [bob["analysis"]],
        "any_name_min": 0.0, "api_key_encrypted": None, "api_key_hint": None,
        "article_id": bob["article"], "article_ids": [bob["article"]],
        "base_url": "https://llm.example/v1", "batch_id": bob["batch"], "batch_ids": [bob["batch"]],
        "changes": {"name": "Przejęta"}, "content": "Tekst.", "content_hash": "h",
        "description": None, "direction": None, "dup_id": bob["nodes"][1], "edge_id": bob["edge"],
        "edges_count": 0, "embedding": vec, "entities": [{"id": bob["nodes"][0], "x": 0, "y": 0}],
        "force": True, "gap_minutes": 30, "id": bob["provider"], "ids": bob["nodes"],
        "keep_id": bob["nodes"][0], "label": "OSOBA", "labels": ["OSOBA"], "lexical": 1.0,
        "lexical_min": 0.0, "limit": 100, "min_shared": 1, "model": "m", "name": "Jan",
        "node_id": bob["nodes"][0], "nodes_count": 0, "offset": 0, "old_label": "OSOBA",
        "props": {}, "provider": "local", "q": "a", "replace_key": True,
        "requested_id": bob["space"], "revision": 0, "rules": "Przejęte", "score": 1.0,
        "score_min": 0.0, "search_k": 100, "search_top": 100, "since": None,
        "source_id": bob["nodes"][0], "source_key": "k", "source_label": "OSOBA",
        "source_name": "Jan", "space_ids": [bob["space"]], "spans": [], "stale_minutes": 0,
        "start": None, "status": "ok", "suggestion_id": bob["suggestion"],
        "target_id": bob["nodes"][1], "target_label": "OSOBA", "target_name": "Anna",
        "title": "T", "token": bob["token"], "top_k": 100, "type": "ZNA", "url": None,
        "vec": vec, "week": None,
    }  # fmt: skip


def _bobs_data(bob: dict) -> str:
    nodes = cypher(
        """MATCH (n) WHERE n.space_id = $s OR n.id IN [$s, $u] OR n.owner_id = $u
           RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props ORDER BY id""",
        s=bob["space"],
        u=bob["user"],
    )
    rels = cypher(
        """MATCH (a)-[r]->(b) WHERE a.space_id = $s OR b.space_id = $s
           RETURN elementId(r) AS id, type(r) AS type, properties(r) AS props ORDER BY id""",
        s=bob["space"],
    )
    return json.dumps([nodes, rels], default=str, sort_keys=True)


def _bobs_ids(bob: dict) -> list[str]:
    return [bob["space"], *bob["nodes"], bob["article"], bob["analysis"], bob["provider"]]


@pytest.fixture
def bobs_world(client, bob, extract, queued) -> dict:
    """Bob's space as full as it gets: a graph, an analysis, a duplicate suggestion, a model."""
    h = bob.headers
    space = client.post("/spaces", json={"name": "Bob"}, headers=h).json()["id"]
    extract(space, *ARTICLE_A, url="https://bob.pl/a", user=bob)
    text, graph = ARTICLE_B
    graph = json.loads(json.dumps(graph).replace("Ewa", _BOBS_ONLY))
    extract(space, text.replace("Ewa", _BOBS_ONLY), graph, url="https://bob.pl/b", user=bob)
    [jan, anna] = [
        r["id"]
        for r in cypher(
            "MATCH (n:Entity {space_id: $s}) WHERE n.name IN ['Jan', 'Anna'] "
            "RETURN n.id AS id ORDER BY n.name DESC",
            s=space,
        )
    ]
    [edge] = cypher("MATCH (:Entity {space_id: $s})-[r:ZNA]->() RETURN elementId(r) AS id", s=space)
    [article] = cypher(
        "MATCH (a:Article {space_id: $s, url: 'https://bob.pl/a'}) "
        "SET a.status = 'processing', a.queue_token = 'bobs-token' RETURN a.id AS id, a.batch_id AS batch",
        s=space,
    )
    analysis = client.post(
        f"/spaces/{space}/analyses", json={"entities": [{"id": jan, "x": 0, "y": 0}]}, headers=h
    ).json()["id"]
    [suggestion] = cypher(
        "CREATE (s:DuplicateSuggestion {id: randomUUID(), space_id: $s, a_label: 'OSOBA', "
        "a_name: 'Jan', b_label: 'OSOBA', b_name: 'Anna', rejected: false, score: 0.9, lexical: 0.9}) "
        "RETURN s.id AS id",
        s=space,
    )
    provider = client.post(
        "/settings/providers",
        json={"name": "Bob", "base_url": "https://llm.example/v1", "model": "m", "api_key": "k"},
        headers=h,
    ).json()["id"]
    return {
        "user": bob.id,
        "space": space,
        "nodes": [jan, anna],
        "edge": edge["id"],
        "article": article["id"],
        "batch": article["batch"],
        "token": "bobs-token",
        "analysis": analysis,
        "suggestion": suggestion["id"],
        "provider": provider,
    }


@pytest.fixture
def alices_scopes(client, alice, extract, space) -> tuple[SpaceScope, UserScope]:
    extract(space, *ARTICLE_A, url="https://alice.pl/a")
    return SpaceScope(space_id=space, owner_id=alice.id), UserScope(user_id=alice.id)


def _bound(query: Query, scopes: tuple[SpaceScope, UserScope], bob: dict) -> dict | str:
    """The query's parameters as an attacker would send them, or what sample is missing."""
    in_space, as_owner = scopes
    scope = in_space if query.kind == "space" else as_owner
    samples = _sample_params(bob) | _FRESH.get(query.name, {})
    wanted = set(re.findall(r"\$(\w+)", query.text)) - scope.params().keys()
    if missing := wanted - samples.keys():
        return f"{query.name}: no sample for {sorted(missing)}"
    return bind(scope, query, {k: samples[k] for k in wanted})


def test_no_query_reaches_another_users_data(bobs_world, alices_scopes):
    leaks = []
    for query in _user_queries():
        params = _bound(query, alices_scopes, bobs_world)
        if isinstance(params, str):
            leaks.append(params)
            continue
        before = _bobs_data(bobs_world)
        try:
            with get_sync_driver().session() as session:
                rows = [r.data() for r in session.run(query.text, params)]
        except Neo4jError as e:
            leaks.append(f"{query.name}: failed with {e.code}, fix its sample parameters")
            continue
        returned = json.dumps(rows, default=str)
        if seen := [i for i in [*_bobs_ids(bobs_world), _BOBS_ONLY] if i in returned]:
            leaks.append(f"{query.name}: returned Bob's {seen}")
        if _bobs_data(bobs_world) != before:
            leaks.append(f"{query.name}: changed Bob's data")
    assert not leaks, "\n".join(leaks)


def _operators(plan: dict) -> list[str]:
    own = plan["operatorType"].split("@")[0]
    return [own, *(o for child in plan.get("children", []) for o in _operators(child))]


def test_every_query_of_users_data_uses_an_index(bobs_world, alices_scopes):
    """Reading every node of a label or every relationship grows with all users' data,
    so one query without an index slows everyone down."""
    scans = []
    for query in _user_queries():
        params = _bound(query, alices_scopes, bobs_world)
        if isinstance(params, str):
            scans.append(params)
            continue
        with get_sync_driver().session() as session:
            plan = session.run("EXPLAIN " + query.text, params).consume().plan
        if found := sorted(set(_operators(plan)) & _FULL_SCANS):
            scans.append(f"{query.name}: {found}")
    assert not scans, "\n".join(scans)
