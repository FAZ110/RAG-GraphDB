import math
import unicodedata
from collections.abc import Callable

Candidate = dict  # {"name": str, "label": str, "score": float}


def normalize_name(name: str) -> str:
    name = name.replace("ł", "l").replace("Ł", "L")
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(stripped.casefold().split())


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


class _UnionFind:
    def __init__(self, items: list[str]) -> None:
        self._parent = {i: i for i in items}

    def find(self, x: str) -> str:
        while self._parent[x] != x:
            self._parent[x] = self._parent[self._parent[x]]
            x = self._parent[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self._parent[rb] = ra

    def groups(self) -> list[list[str]]:
        out: dict[str, list[str]] = {}
        for item in self._parent:
            out.setdefault(self.find(item), []).append(item)
        return list(out.values())


def _name(node: dict) -> str:
    return node["properties"]["name"]


def _add_alias(node: dict, alias: str) -> None:
    aliases = node.setdefault("aliases", [])
    if alias != _name(node) and alias not in aliases:
        aliases.append(alias)


def _merge_groups(
    groups: list[list[str]], nodes: list[dict], edges: list[dict]
) -> tuple[list[dict], list[dict]]:
    by_id = {n["id"]: n for n in nodes}
    degree: dict[str, int] = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1

    remap: dict[str, str] = {}
    merged: list[dict] = []
    for ids in groups:
        members = [by_id[i] for i in ids]
        canonical = max(members, key=lambda n: (degree.get(n["id"], 0), len(_name(n)), n["id"]))
        for m in members:
            remap[m["id"]] = canonical["id"]
            if m is canonical:
                continue
            _add_alias(canonical, _name(m))
            for alias in m.get("aliases", []):
                _add_alias(canonical, alias)
            for key, value in m["properties"].items():
                canonical["properties"].setdefault(key, value)
        merged.append(canonical)

    seen: set[tuple[str, str, str]] = set()
    new_edges: list[dict] = []
    for e in edges:
        src, tgt = remap[e["source"]], remap[e["target"]]
        key = (src, tgt, e["type"])
        if src == tgt or key in seen:
            continue
        seen.add(key)
        new_edges.append({**e, "source": src, "target": tgt})
    return merged, new_edges


def resolve_batch(
    nodes: list[dict],
    edges: list[dict],
    embeddings: dict[str, list[float]],
    threshold: float,
) -> tuple[list[dict], list[dict]]:
    uf = _UnionFind([n["id"] for n in nodes])
    for i, a in enumerate(nodes):
        for b in nodes[i + 1 :]:
            if normalize_name(_name(a)) == normalize_name(_name(b)) or (
                cosine(embeddings[a["id"]], embeddings[b["id"]]) >= threshold
            ):
                uf.union(a["id"], b["id"])
    return _merge_groups(uf.groups(), nodes, edges)


def match_existing(
    nodes: list[dict],
    embeddings: dict[str, list[float]],
    find_candidates: Callable[[list[float]], list[Candidate]],
    threshold: float,
) -> None:
    for node in nodes:
        name = _name(node)
        for cand in find_candidates(embeddings[node["id"]]):  # posortowane malejąco po score
            if not cand["label"]:
                continue
            if cand["score"] >= threshold or normalize_name(cand["name"]) == normalize_name(name):
                node["label"] = cand["label"]
                node["properties"]["name"] = cand["name"]
                _add_alias(node, name)
                break


def merge_same_key(nodes: list[dict], edges: list[dict]) -> tuple[list[dict], list[dict]]:
    groups: dict[tuple[str, str], list[str]] = {}
    for n in nodes:
        groups.setdefault((n["label"], _name(n)), []).append(n["id"])
    return _merge_groups(list(groups.values()), nodes, edges)
