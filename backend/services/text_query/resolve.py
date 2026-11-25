from difflib import SequenceMatcher

from db.access.scopes import SpaceScope
from db.graph.reads import entities_named, search_nodes
from services.embedding_service import embed_in_thread
from services.text_query.words import MIN_WORD, fold, words

_NEAREST = 8
_WORD_RATIO = 0.8
_NAME_RATIO = 0.75


def looks_alike(wanted: str, name: str) -> bool:
    """Whether a name the model gave plausibly means an entity's name: "Lecha" and
    "Lech Poznań" do, "Lech" and "Legia" do not."""
    a, b = fold(wanted), fold(name)
    if not a or not b:
        return False
    if a in b or b in a or SequenceMatcher(None, a, b).ratio() >= _NAME_RATIO:
        return True
    long_words = [[w for w in words(t) if len(w) >= MIN_WORD] for t in (a, b)]
    return any(
        SequenceMatcher(None, x, y).ratio() >= _WORD_RATIO
        for x in long_words[0]
        for y in long_words[1]
    )


async def _nearest(scope: SpaceScope, name: str) -> str | None:
    hits = await search_nodes(scope, await embed_in_thread(name), _NEAREST)
    return next((h["id"] for h in hits if looks_alike(name, h["name"])), None)


async def resolve(scope: SpaceScope, names: list[str]) -> dict[str, str]:
    """Each name's entity in the space: by exact name or alias first, then by the nearest
    embedding whose name looks alike. Names with no such entity are left out."""
    if not names:
        return {}
    found = await entities_named(scope, names)
    for name in names:
        if name not in found and (entity := await _nearest(scope, name)):
            found[name] = entity
    return found
