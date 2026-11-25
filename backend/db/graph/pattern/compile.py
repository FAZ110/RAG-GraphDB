from itertools import combinations, pairwise

from db.access.queries import Query
from db.graph.pattern.symmetry import interchangeable
from schemas.query import GraphPattern, PatternEdge, PatternNode

# Rows read at most. A pattern with many paths per match is cut here, which the result reports.
MAX_ROWS = 2000
# How a link through a shared article is told in the answer, as no relationship stands for it.
MENTIONED_TOGETHER = "WSPOMNIANE_RAZEM"

_ARROWS = {"out": ("-", "->"), "in": ("<-", "-"), "any": ("-", "-")}


def _node(node: PatternNode, first: bool) -> str:
    """The node where it first appears carries its space, and its type for the index."""
    if not first:
        return f"({node.key})"
    props = "space_id: $space_id"
    if node.label and not node.known:
        props += f", label: ${node.key}_label"
    return f"({node.key}:Entity {{{props}}})"


def _path(left: str, edge: PatternEdge, right: str) -> str:
    """The link drawn between two node patterns, as the edge asks for it."""
    if edge.via == "articles":
        return f"{left}<-[:MENTIONS]-(:Article {{space_id: $space_id}})-[:MENTIONS]->{right}"
    # Types are validated identifiers; Cypher takes no parameter for them in a pattern.
    rel = f"[:`{edge.type}`]" if edge.type else "[]"
    head, tail = _ARROWS[edge.direction]
    if edge.max_hops == 1:
        return f"{left}{head}{rel}{tail}{right}"
    # Every node on the way is an entity, never an article that mentions one.
    hops = f"{{{edge.min_hops},{edge.max_hops}}}"
    return f"{left} ((:Entity){head}{rel}{tail}(:Entity)){hops} {right}"


# One entity of a known node inside a subquery, `_kid` running over the node's ids; the
# underscore keeps it apart from the pattern's keys, which never start with one.
_MEMBER = "(:Entity {space_id: $space_id, id: _kid})"


def _ordered(edges: list[PatternEdge], bound: set[str]) -> list[PatternEdge]:
    """Edges in an order where each one touches a node matched before it."""
    left, ordered = list(edges), []
    while left:
        edge = next(e for e in left if e.source in bound or e.target in bound)
        left.remove(edge)
        ordered.append(edge)
        bound |= {edge.source, edge.target}
    return ordered


def _sought_conditions(node: PatternNode, params: dict) -> list[str]:
    conditions = []
    if node.label:
        params[f"{node.key}_label"] = node.label
    if node.min_degree is not None:
        conditions.append(f"COUNT {{ ({node.key})--(:Entity) }} > ${node.key}_min_degree")
        params[f"{node.key}_min_degree"] = node.min_degree
    if node.name_contains:
        conditions.append(f"toLower({node.key}.name) CONTAINS toLower(${node.key}_name)")
        params[f"{node.key}_name"] = node.name_contains
    if node.link_count:
        conditions.append(_counted(node, params))
    return conditions


def _counted_links(node: PatternNode) -> str:
    """The links a node's count is made of, `_r` to `_m`; the label is a parameter."""
    count = node.link_count
    rel = f"[_r:`{count.type}`]" if count.type else "[_r]"
    label = f", label: ${node.key}_count_label" if count.label else ""
    return f"({node.key})-{rel}-(_m:Entity {{space_id: $space_id{label}}})"


def _counted(node: PatternNode, params: dict) -> str:
    """How many different entities the node is linked to, by a relationship and of a type
    when given; each counted once however many links it has, as data may hold one twice."""
    count = node.link_count
    if count.label:
        params[f"{node.key}_count_label"] = count.label
    params[f"{node.key}_count_min"] = count.min
    return (
        f"size(COLLECT {{ MATCH {_counted_links(node)} RETURN DISTINCT _m.id }})"
        f" >= ${node.key}_count_min"
    )


def _ends(edge: PatternEdge, group: str) -> tuple[str, str]:
    """Both ends of a link inside a subquery, the known node `group` standing for any member."""
    left = _MEMBER if edge.source == group else f"({edge.source})"
    right = _MEMBER if edge.target == group else f"({edge.target})"
    return left, right


def compile_pattern(pattern: GraphPattern) -> tuple[Query, dict]:
    """Cypher matching the pattern in one space, with its parameters. Known nodes are matched
    first, then each required link from a node already matched, so the query walks out from
    what the user picked instead of scanning the space. Links that must not exist and
    "at least" become conditions; optional links are matched last."""
    nodes = {n.key: n for n in pattern.nodes}
    core = pattern.core()
    leaves = pattern.optional_leaves()
    excluded = pattern.excluded()
    params: dict = {"rows": MAX_ROWS}
    lines: list[str] = []
    bound: set[str] = set()

    for node in pattern.nodes:
        if node.known:
            params[f"{node.key}_ids"] = node.ids
            if node.key in core:
                lines.append(f"MATCH {_node(node, True)} WHERE {node.key}.id IN ${node.key}_ids")
                bound.add(node.key)
            if node.at_least:
                params[f"{node.key}_at_least"] = node.at_least
    if not bound:
        start = next((nodes[k] for k in core if nodes[k].label), nodes[core[0]])
        lines.append(f"MATCH {_node(start, True)}")
        bound.add(start.key)

    required = [e for e in pattern.edges if e.mode == "required"]
    # Each path variable with the edge it was matched for.
    matched: list[tuple[str, PatternEdge]] = []
    for edge in _ordered(required, set(bound)):
        source = _node(nodes[edge.source], edge.source not in bound)
        target = _node(nodes[edge.target], edge.target not in bound)
        matched.append((f"p{len(matched)}", edge))
        lines.append(f"MATCH {matched[-1][0]} = {_path(source, edge, target)}")
        bound |= {edge.source, edge.target}

    conditions = []
    if pattern.within is not None:
        params["within"] = pattern.within
    for key in core:
        if not nodes[key].known:
            conditions += _sought_conditions(nodes[key], params)
            if pattern.within is not None:
                conditions.append(f"{key}.id IN $within")
    # Each node of the pattern stands for a different entity.
    conditions += [f"{a} <> {b}" for a, b in combinations(core, 2)]
    # Nodes that can swap places take their entities in one order only, so a pair comes once.
    sought = [k for k in core if not nodes[k].known]
    for group in interchangeable(pattern, sought):
        conditions += [f"{a}.id < {b}.id" for a, b in pairwise(group)]
    for key in excluded:
        conditions += [f"NOT {k}.id IN ${key}_ids" for k in core if not nodes[k].known]
    for edge in required:
        # "At least K of these": counted over the known node's entities, one row matched each.
        for group in (edge.source, edge.target):
            if nodes[group].at_least:
                left, right = _ends(edge, group)
                conditions.append(
                    f"size([_kid IN ${group}_ids WHERE EXISTS {{ MATCH {_path(left, edge, right)} }}])"
                    f" >= ${group}_at_least"
                )
    for edge in pattern.edges:
        if edge.mode != "not":
            continue
        # A known node kept out stands for all its entities: linked to none of them.
        group = next((k for k in (edge.source, edge.target) if k in excluded), "")
        left, right = _ends(edge, group)
        if group:
            conditions.append(
                f"NONE(_kid IN ${group}_ids WHERE EXISTS {{ MATCH {_path(left, edge, right)} }})"
            )
        else:
            conditions.append(f"NOT EXISTS {{ MATCH {_path(left, edge, right)} }}")
    if conditions:
        lines.append("WHERE " + "\n  AND ".join(conditions))

    for edge in pattern.edges:
        if edge.mode != "optional":
            continue
        leaf = nodes[edge.source if edge.source in leaves else edge.target]
        source = _node(nodes[edge.source], edge.source == leaf.key)
        target = _node(nodes[edge.target], edge.target == leaf.key)
        name = f"o{len(matched)}"
        matched.append((name, edge))
        lines.append(f"OPTIONAL MATCH {name} = {_path(source, edge, target)}")
        rules = _sought_conditions(leaf, params) + [f"{leaf.key} <> {k}" for k in core]
        if pattern.within is not None:
            rules.append(f"{leaf.key}.id IN $within")
        lines.append("  WHERE " + " AND ".join(rules))

    # A missing optional link leaves its path empty.
    # A count is answered with what it counted, so the answer shows which entities they are.
    counted = [nodes[k] for k in core if not nodes[k].known and nodes[k].link_count]
    rels = (
        " + ".join(
            [f"coalesce(relationships({p}), [])" for p, _ in matched]
            + [f"COLLECT {{ MATCH {_counted_links(n)} RETURN _r }}" for n in counted]
        )
        or "[]"
    )
    via = (
        " + ".join(
            [f"coalesce(nodes({p}), [])" for p, _ in matched]
            + [f"COLLECT {{ MATCH {_counted_links(n)} RETURN DISTINCT _m }}" for n in counted]
        )
        or "[]"
    )
    sought = ", ".join(f"{n.key}: {n.key}.id" for n in pattern.nodes if not n.known)
    # A shared article is told as one link between the two entities, not as the two mentions.
    together = [
        f"CASE WHEN {p} IS NULL THEN [] ELSE [{{id: '{MENTIONED_TOGETHER}:' + {e.source}.id"
        f" + ':' + {e.target}.id, source: {e.source}.id, target: {e.target}.id,"
        f" type: '{MENTIONED_TOGETHER}'}}] END"
        for p, e in matched
        if e.via == "articles"
    ]
    told = " + ".join(
        [
            f"[r IN {rels} WHERE type(r) <> 'MENTIONS' | {{id: elementId(r),"
            f" source: startNode(r).id, target: endNode(r).id, type: type(r)}}]"
        ]
        + together
    )
    # What each count came to, and the biggest first, before the rows are cut.
    tallies = ", ".join(
        f"{n.key}: size(COLLECT {{ MATCH {_counted_links(n)} RETURN DISTINCT _m.id }})"
        for n in counted
    )
    order = ", ".join(f"counted.{n.key} DESC" for n in counted)
    lines.append(
        f"RETURN {{{sought}}} AS match,\n"
        f"       {told} AS edges,\n"
        f"       [x IN {via} WHERE x:Entity | x.id] AS via,\n"
        f"       {{{tallies}}} AS counted\n"
        + (f"ORDER BY {order}\n" if order else "")
        + "LIMIT $rows"
    )
    return Query(name="graph_pattern", kind="space", text="\n".join(lines)), params
