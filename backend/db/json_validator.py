from pydantic import BaseModel, field_validator, model_validator


class NodeSchema(BaseModel):
    id: str
    label: str
    properties: dict

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


class EdgeSchema(BaseModel):
    source: str
    target: str
    type: str
    properties: dict = {}


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
