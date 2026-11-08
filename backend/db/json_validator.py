from pydantic import BaseModel, field_validator, model_validator

ENTITY_TYPES = {"OSOBA", "ORGANIZACJA", "MIEJSCE", "WYDARZENIE", "PRODUKT", "POJĘCIE"}


def _ids_as_list(v) -> list[str]:
    """Sentence ids the LLM cites; a single id or numbers are accepted, anything else dropped."""
    if isinstance(v, str | int):
        v = [v]
    return [str(i) for i in v if isinstance(i, str | int)] if isinstance(v, list) else []


class NodeSchema(BaseModel):
    id: str
    label: str
    properties: dict
    aliases: list[str] = []
    type: str | None = None
    evidence: list[str] = []

    _evidence_as_list = field_validator("evidence", mode="before")(_ids_as_list)

    @field_validator("type", mode="before")
    @classmethod
    def known_type_or_none(cls, v):
        v = v.strip().upper() if isinstance(v, str) else None
        return v if v in ENTITY_TYPES else None

    @field_validator("label")
    @classmethod
    def label_must_be_uppercase(cls, v):
        if not v.isupper():
            raise ValueError(f"Label must be uppercase, got: '{v}'")
        return v

    @field_validator("properties")
    @classmethod
    def must_have_name(cls, v):
        if not v.get("name", "").strip():
            raise ValueError("Node must have a non-empty 'name' property")
        return v

    @field_validator("aliases", mode="before")
    @classmethod
    def aliases_as_list(cls, v):
        if isinstance(v, str):
            return [v]
        return [a for a in v if isinstance(a, str)] if isinstance(v, list) else []

    @model_validator(mode="after")
    def drop_blank_and_own_name(self):
        name = self.properties["name"].strip()
        self.aliases = list(
            dict.fromkeys(a.strip() for a in self.aliases if a.strip() not in ("", name))
        )
        return self


class EdgeSchema(BaseModel):
    source: str
    target: str
    type: str
    properties: dict = {}
    evidence: list[str] = []

    _evidence_as_list = field_validator("evidence", mode="before")(_ids_as_list)


class GraphSchema(BaseModel):
    nodes: list[NodeSchema]
    edges: list[EdgeSchema]

    @model_validator(mode="after")
    def edges_reference_known_nodes(self):
        ids = {n.id for n in self.nodes}
        for e in self.edges:
            if e.source not in ids or e.target not in ids:
                raise ValueError("Edges references unknown node id")
        return self


def validate_graph_json(data: dict) -> GraphSchema:
    return GraphSchema.model_validate(data)
