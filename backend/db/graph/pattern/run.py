from db.access import gate
from db.access.scopes import SpaceScope
from db.driver import translates_neo4j_errors
from db.graph.pattern.compile import MAX_ROWS, compile_pattern
from db.graph.pattern.symmetry import interchangeable
from db.graph.reads import nodes_by_ids
from schemas.query import GraphPattern


def _counts(pattern: GraphPattern, sought: list[str], matches: list[dict]) -> dict[str, int]:
    """Different entities standing for each sought node; nodes that can swap places share theirs,
    as which of them an entity lands on is only the order the query takes them in."""
    shared = {k: g for g in interchangeable(pattern, sought) for k in g}
    return {k: len({b[j] for b in matches for j in shared.get(k, [k]) if b[j]}) for k in sought}


@translates_neo4j_errors
async def run_pattern(scope: SpaceScope, pattern: GraphPattern) -> dict:
    """One page of the ways the pattern fits the space's graph: which entity stands for each
    sought node, most counted and best connected first, with the nodes and links that make
    each match. The ranking is the same on every page, so pages follow on without gaps."""
    query, params = compile_pattern(pattern)
    rows = await gate.rows(scope, query, params)
    sought = [n.key for n in pattern.nodes if not n.known]

    matches: dict[tuple[str, ...], dict] = {}
    # What each match is made of, so a page brings only its own links.
    made: dict[tuple[str, ...], tuple[dict[str, dict], set[str]]] = {}
    # For each sought node with a count, what it came to for each entity standing for it.
    counted: dict[str, dict[str, int]] = {}
    for row in rows:
        binding = dict(row["match"])
        key = tuple(binding[k] for k in sought)
        if key not in matches:
            matches[key] = binding
            made[key] = ({}, set())
            for k, n in dict(row["counted"]).items():
                counted.setdefault(k, {})[binding[k]] = n
        made[key][0].update({e["id"]: dict(e) for e in row["edges"]})
        made[key][1].update(row["via"])

    # An optional link that is missing leaves its sought node empty in the match.
    found = {i for binding in matches.values() for i in binding.values() if i}
    entities = {n["id"]: n for n in await nodes_by_ids(scope, list(found))} if found else {}
    degree = {i: n["degree"] for i, n in entities.items()}

    def rank(key: tuple[str, ...]) -> tuple:
        b = matches[key]
        return (
            -sum(counted.get(k, {}).get(b[k], 0) for k in sought),
            -sum(degree.get(b[k], 0) for k in sought),
            # Ties broken the same way every time, or pages could repeat or skip a match.
            tuple(i or "" for i in key),
        )

    page = sorted(matches, key=rank)[pattern.skip : pattern.skip + pattern.limit]
    edges = {i: e for key in page for i, e in made[key][0].items()}
    shown = {i for key in page for i in matches[key].values() if i}
    # The page's entities and those its links run through, fetched only if not already.
    wanted = shown | {i for key in page for i in made[key][1]}
    missing = list(wanted - entities.keys())
    entities |= {n["id"]: n for n in await nodes_by_ids(scope, missing)} if missing else {}
    return {
        "matches": [matches[key] for key in page],
        "total": len(matches),
        "counts": _counts(pattern, sought, list(matches.values())),
        "counted": {k: {i: n for i, n in c.items() if i in shown} for k, c in counted.items()},
        "nodes": [entities[i] for i in wanted if i in entities],
        "edges": list(edges.values()),
        "truncated": len(rows) >= MAX_ROWS,
        "cypher": query.text,
        # Its values as sent, without the scope's own, for whoever reads the Cypher.
        "params": {k: v for k, v in params.items() if k != "rows"},
    }
