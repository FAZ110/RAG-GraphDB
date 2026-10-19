import math
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass

Candidate = dict  # {"name": str, "label": str, "score": float}
MergeLog = list[dict] | None
OnMerge = Callable[[dict, dict], None] | None

DEDUP_LOG_KEY = "debug:dedup:log"
DEDUP_LOG_MAX = 5000


def normalize_name(name: str) -> str:
    name = name.replace("ł", "l").replace("Ł", "L")
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(stripped.casefold().split())


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def _jaro(s: str, t: str) -> float:
    if s == t:
        return 1.0
    if not s or not t:
        return 0.0
    window = max(len(s), len(t)) // 2 - 1
    s_hit = [False] * len(s)
    t_hit = [False] * len(t)
    matches = 0
    for i, c in enumerate(s):
        for j in range(max(0, i - window), min(len(t), i + window + 1)):
            if not t_hit[j] and t[j] == c:
                s_hit[i] = t_hit[j] = True
                matches += 1
                break
    if not matches:
        return 0.0
    transpositions = 0
    k = 0
    for i, hit in enumerate(s_hit):
        if hit:
            while not t_hit[k]:
                k += 1
            if s[i] != t[k]:
                transpositions += 1
            k += 1
    m = matches
    return (m / len(s) + m / len(t) + (m - transpositions / 2) / m) / 3


def jaro_winkler(s: str, t: str) -> float:
    jaro = _jaro(s, t)
    prefix = 0
    for a, b in zip(s[:4], t[:4], strict=False):
        if a != b:
            break
        prefix += 1
    return jaro + prefix * 0.1 * (1 - jaro)


def name_similarity(a: str, b: str) -> float:
    ta, tb = normalize_name(a).split(), normalize_name(b).split()
    if not ta or not tb:
        return 0.0
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return min(max(jaro_winkler(x, y) for y in long_) for x in short)


@dataclass(frozen=True)
class MatchConfig:
    threshold: float
    name_min_score: float
    lexical_min: float


def _match_reason(a_name: str, b_name: str, score: float, cfg: MatchConfig) -> str | None:
    if normalize_name(a_name) == normalize_name(b_name):
        return "name" if score >= cfg.name_min_score else None
    if score >= cfg.threshold and name_similarity(a_name, b_name) >= cfg.lexical_min:
        return "embedding"
    return None


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


def _log_entry(
    stage: str, member: dict, into_name: str, into_label: str, score: float, reason: str
) -> dict:
    return {
        "stage": stage,
        "from": _name(member),
        "from_label": member["label"],
        "into": into_name,
        "into_label": into_label,
        "score": score,
        "lexical": name_similarity(_name(member), into_name),
        "reason": reason,
    }


def _merge_groups(
    groups: list[list[str]], nodes: list[dict], edges: list[dict], on_merge: OnMerge = None
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
            if on_merge:
                on_merge(m, canonical)
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
    cfg: MatchConfig,
    log: MergeLog = None,
) -> tuple[list[dict], list[dict]]:
    uf = _UnionFind([n["id"] for n in nodes])
    for i, a in enumerate(nodes):
        for b in nodes[i + 1 :]:
            score = cosine(embeddings[a["id"]], embeddings[b["id"]])
            if _match_reason(_name(a), _name(b), score, cfg):
                uf.union(a["id"], b["id"])

    def on_merge(member: dict, canonical: dict) -> None:
        if log is None:
            return
        same_name = normalize_name(_name(member)) == normalize_name(_name(canonical))
        score = cosine(embeddings[member["id"]], embeddings[canonical["id"]])
        log.append(
            _log_entry(
                "batch",
                member,
                _name(canonical),
                canonical["label"],
                score,
                "name" if same_name else "embedding",
            )
        )

    return _merge_groups(uf.groups(), nodes, edges, on_merge)


def match_existing(
    nodes: list[dict],
    embeddings: dict[str, list[float]],
    find_candidates: Callable[[list[float]], list[Candidate]],
    cfg: MatchConfig,
    log: MergeLog = None,
) -> None:
    for node in nodes:
        name = _name(node)
        for cand in find_candidates(embeddings[node["id"]]):  # sorted by score, descending
            if not cand["label"]:
                continue
            reason = _match_reason(name, cand["name"], cand["score"], cfg)
            if reason:
                if log is not None and (cand["name"], cand["label"]) != (name, node["label"]):
                    log.append(
                        _log_entry(
                            "existing", node, cand["name"], cand["label"], cand["score"], reason
                        )
                    )
                node["label"] = cand["label"]
                node["properties"]["name"] = cand["name"]
                _add_alias(node, name)
                break


def merge_same_key(nodes: list[dict], edges: list[dict]) -> tuple[list[dict], list[dict]]:
    groups: dict[tuple[str, str], list[str]] = {}
    for n in nodes:
        groups.setdefault((n["label"], _name(n)), []).append(n["id"])
    return _merge_groups(list(groups.values()), nodes, edges)
