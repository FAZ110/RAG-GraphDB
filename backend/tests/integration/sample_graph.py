"""A small graph made of two articles, shared by the tests that read or delete it:

Jan ─GRA_W→ Inter ←GRA_W─ Anna        (article A)
Jan ─ZNA→ Anna
Ewa ─GRA_W→ Milan ─RYWAL→ Inter       (article B)
"""


def entity(id: str, name: str, label: str, sentence: str) -> dict:
    return {"id": id, "label": label, "type": None, "properties": {"name": name},
            "evidence": [sentence]}  # fmt: skip


def rel(source: str, target: str, type: str, sentence: str) -> dict:
    return {"source": source, "target": target, "type": type, "evidence": [sentence]}


ARTICLE_A = (
    "Jan i Anna grają w Inter. Jan zna Annę od lat.",
    {
        "nodes": [
            entity("1", "Jan", "OSOBA", "S1"),
            entity("2", "Anna", "OSOBA", "S1"),
            entity("3", "Inter", "KLUB", "S1"),
        ],
        "edges": [
            rel("1", "3", "GRA_W", "S1"),
            rel("2", "3", "GRA_W", "S1"),
            rel("1", "2", "ZNA", "S2"),
        ],
    },
)
ARTICLE_B = (
    "Ewa gra w Milan. Milan to rywal Interu.",
    {
        "nodes": [
            entity("1", "Ewa", "OSOBA", "S1"),
            entity("2", "Milan", "KLUB", "S1"),
            entity("3", "Inter", "KLUB", "S2"),
        ],
        "edges": [rel("1", "2", "GRA_W", "S1"), rel("2", "3", "RYWAL", "S2")],
    },
)
