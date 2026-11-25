from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, model_validator

from schemas.graph import Identifier

# Keys become Cypher variables, so they are kept to short lowercase identifiers.
Key = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9]{0,7}$")]
NamePart = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
MAX_HOPS = 3


class LinkCount(BaseModel):
    """Linked to at least `min` different entities, by `type` and of `label` when given:
    "grał dla co najmniej 2 klubów"."""

    min: int = Field(ge=1, le=1000)
    type: Identifier | None = None
    label: Identifier | None = None


class PatternNode(BaseModel):
    """A node of the pattern: known when it has ids (any of them matches), sought otherwise."""

    key: Key
    ids: list[str] | None = Field(default=None, min_length=1, max_length=50)
    label: Identifier | None = None
    # More links to other entities than this.
    min_degree: int | None = Field(default=None, ge=0, le=100_000)
    name_contains: NamePart | None = None
    # Known only: linked to at least this many of its entities, instead of any one of them.
    at_least: int | None = Field(default=None, ge=2, le=50)
    # Sought only: how many entities it must be linked to, counted in the graph.
    link_count: LinkCount | None = None

    @property
    def known(self) -> bool:
        return self.ids is not None


class PatternEdge(BaseModel):
    """A link between two nodes of the pattern; `direction` is seen from `source`.

    `mode`: the link must exist, may exist (its far end is then a sought node with no other
    link, empty when missing), or must not exist. `via`: a relationship between the two,
    or an article mentioning both."""

    source: Key
    target: Key
    type: Identifier | None = None
    direction: Literal["out", "in", "any"] = "any"
    min_hops: int = Field(default=1, ge=1, le=MAX_HOPS)
    max_hops: int = Field(default=1, ge=1, le=MAX_HOPS)
    mode: Literal["required", "optional", "not"] = "required"
    via: Literal["relation", "articles"] = "relation"


class GraphPattern(BaseModel):
    nodes: list[PatternNode] = Field(min_length=1, max_length=6)
    edges: list[PatternEdge] = Field(default=[], max_length=8)
    # A page of the matches: how many, after how many of the ranked ones.
    limit: int = Field(default=100, ge=1, le=500)
    skip: int = Field(default=0, ge=0, le=100_000)
    # Only these entities may answer the sought nodes, e.g. those on an analysis's canvas.
    within: list[str] | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def _well_formed(self) -> "GraphPattern":
        keys = [n.key for n in self.nodes]
        if len(set(keys)) != len(keys):
            raise ValueError("Każdy węzeł wzorca musi mieć inny klucz")
        for edge in self.edges:
            if edge.source not in keys or edge.target not in keys:
                raise ValueError("Połączenie prowadzi do węzła spoza wzorca")
            if edge.source == edge.target:
                raise ValueError("Połączenie musi łączyć dwa różne węzły")
            if edge.min_hops > edge.max_hops:
                raise ValueError("Najkrótsza długość połączenia przekracza najdłuższą")
            if edge.via == "articles" and (edge.type or edge.max_hops > 1):
                raise ValueError("Wspomniane razem nie ma relacji ani długości")
        for node in self.nodes:
            if node.at_least is not None and (not node.ids or node.at_least > len(node.ids)):
                raise ValueError("„Co najmniej” przekracza liczbę encji w węźle")
            if node.link_count is not None and node.known:
                raise ValueError("Liczbę powiązań można ustawić tylko szukanej encji")
        nodes = {n.key: n for n in self.nodes}
        leaves = self.optional_leaves()
        for edge in self.edges:
            if edge.mode == "optional" and len({edge.source, edge.target} & leaves) != 1:
                raise ValueError(
                    "Opcjonalne połączenie musi prowadzić do szukanej encji bez innych połączeń"
                )
            if edge.mode == "not" and (
                {edge.source, edge.target} & leaves
                or nodes[edge.source].known
                and nodes[edge.target].known
            ):
                raise ValueError("Wykluczone połączenie musi dotyczyć szukanej encji")
        core = self.core()
        if not any(not nodes[k].known for k in core):
            raise ValueError("Dodaj węzeł, którego szukasz")
        required = [e for e in self.edges if e.mode == "required"]
        if not _connected(core, required):
            raise ValueError("Wszystkie węzły wzorca muszą być ze sobą połączone")
        return self

    def optional_leaves(self) -> set[str]:
        """Sought nodes reached only by one optional link: empty in a match when it is missing."""
        known = {n.key for n in self.nodes if n.known}
        touching: dict[str, list[PatternEdge]] = {}
        for edge in self.edges:
            touching.setdefault(edge.source, []).append(edge)
            touching.setdefault(edge.target, []).append(edge)
        return {
            key
            for key, edges in touching.items()
            if key not in known and len(edges) == 1 and edges[0].mode == "optional"
        }

    def excluded(self) -> set[str]:
        """Known nodes linked only by links that must not exist: never matched, only kept out."""
        return {
            n.key
            for n in self.nodes
            if n.known
            and (links := [e for e in self.edges if n.key in (e.source, e.target)])
            and all(e.mode == "not" for e in links)
        }

    def core(self) -> list[str]:
        """The nodes every match must have: all but optional leaves and excluded known nodes."""
        aside = self.optional_leaves() | self.excluded()
        return [n.key for n in self.nodes if n.key not in aside]


class TextQuestion(BaseModel):
    """A question in words, to be drawn as a pattern by the given language model."""

    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]
    provider: Annotated[str, StringConstraints(min_length=1, max_length=100)]


def _connected(keys: list[str], edges: list[PatternEdge]) -> bool:
    if not keys:
        return False
    reached = {keys[0]}
    grew = True
    while grew:
        grew = False
        for edge in edges:
            ends = {edge.source, edge.target}
            if ends & reached and not ends <= reached:
                reached |= ends
                grew = True
    return set(keys) <= reached
