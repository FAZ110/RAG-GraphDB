"""Sought nodes a pattern cannot tell apart: swapping two of them leaves the pattern the same,
so without care each match would come back once for every order of their entities."""

from schemas.query import GraphPattern, PatternEdge, PatternNode


def _traits(node: PatternNode) -> dict:
    return node.model_dump(exclude={"key"})


def _link(edge: PatternEdge, swap: dict[str, str]) -> tuple:
    source, target = swap.get(edge.source, edge.source), swap.get(edge.target, edge.target)
    direction = edge.direction
    if direction == "in":
        source, target, direction = target, source, "out"
    ends = (source, target) if direction == "out" else tuple(sorted((source, target)))
    return (ends, direction, edge.type or "", edge.min_hops, edge.max_hops, edge.mode, edge.via)


def _swappable(pattern: GraphPattern, a: str, b: str) -> bool:
    links = sorted(_link(e, {}) for e in pattern.edges)
    return links == sorted(_link(e, {a: b, b: a}) for e in pattern.edges)


def interchangeable(pattern: GraphPattern, keys: list[str]) -> list[list[str]]:
    """Groups of these sought nodes, any two of which can swap places, in pattern order.
    Swaps with a group's first node are enough: any two swaps through it compose into the third."""
    nodes = {n.key: n for n in pattern.nodes}
    groups: list[list[str]] = []
    for key in keys:
        group = next(
            (
                g
                for g in groups
                if _traits(nodes[g[0]]) == _traits(nodes[key]) and _swappable(pattern, g[0], key)
            ),
            None,
        )
        if group:
            group.append(key)
        else:
            groups.append([key])
    return [g for g in groups if len(g) > 1]
