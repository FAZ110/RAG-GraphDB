import re

# A sentence ends at . ! ? or … (optionally closed by a quote or bracket) followed by a capital
# or digit, or at a blank line.
_BOUNDARY = re.compile(
    r"(?:(?<=[.!?…])|(?<=[.!?…][\"”»)]))\s+(?=[\"„«(]?[A-ZĄĆĘŁŃÓŚŹŻ0-9])|\n\s*\n"
)
# Words whose trailing dot does not end a sentence.
_ABBREVIATIONS = {
    "al", "dr", "godz", "im", "inż", "m.in", "mgr", "nr", "np", "ok", "prof", "św", "tj", "tys",
    "tzn", "tzw", "ul", "wg",
}  # fmt: skip


def _is_abbreviation(text: str) -> bool:
    words = text.split()
    if not words or not words[-1].endswith("."):
        return False
    word = words[-1].rstrip(".").lstrip('"„«(')
    # Initials ("R. Lewandowski") and ordinals ("1. FC Köln"), but not years, which often end one.
    return (
        word.casefold() in _ABBREVIATIONS
        or (len(word) == 1 and word.isupper())
        or (word.isdigit() and len(word) <= 2)
    )


def split_sentences(content: str) -> list[tuple[int, int]]:
    """[start, end) of each sentence in `content`, whitespace trimmed.

    shortcut: a regex heuristic with a fixed abbreviation list; switch to a segmenter
    (pysbd, spaCy pl) once splitting mistakes start to matter.
    """
    spans: list[tuple[int, int]] = []
    start = 0
    for m in _BOUNDARY.finditer(content):
        if m.group().count("\n") < 2 and _is_abbreviation(content[start : m.start()]):
            continue
        spans.append((start, m.start()))
        start = m.end()
    spans.append((start, len(content)))

    trimmed = []
    for s, e in spans:
        piece = content[s:e]
        if piece.strip():
            lead, trail = len(piece) - len(piece.lstrip()), len(piece) - len(piece.rstrip())
            trimmed.append((s + lead, e - trail))
    return trimmed


def numbered(content: str, sentences: list[tuple[int, int]]) -> str:
    return "\n".join(f"[S{i}] {content[s:e]}" for i, (s, e) in enumerate(sentences, 1))


def _span(content: str, s: int, e: int) -> str:
    # UTF-16 units, as JavaScript and Neo4j count them (Python differs past emoji).
    def utf16(i: int) -> int:
        return len(content[:i].encode("utf-16-le")) // 2

    return f"{utf16(s)}:{utf16(e)}"


def to_spans(ids: list[str], content: str, sentences: list[tuple[int, int]]) -> list[str]:
    spans = []
    for sid in ids:
        digits = sid.strip().lstrip("[Ss").rstrip("]")
        if digits.isdigit() and 1 <= int(digits) <= len(sentences):
            spans.append(_span(content, *sentences[int(digits) - 1]))
    return list(dict.fromkeys(spans))


def _word_pattern(word: str) -> str:
    # Longer words match by stem, since Polish inflects names (as in entityMatch.ts).
    if not word.isalpha() or len(word) <= 3:
        return rf"{re.escape(word)}(?![^\W_])"
    return rf"{re.escape(word[: -2 if len(word) >= 6 else -1])}[^\W\d_]*"


def _names_pattern(names: list[str]) -> re.Pattern:
    alternatives = (
        r"\s*-\s*".join(r"\s+".join(map(_word_pattern, part.split())) for part in name.split("-"))
        for name in names
        if name.strip()
    )
    return re.compile(rf"(?<![^\W_])(?:{'|'.join(alternatives)})", re.IGNORECASE)


def mentioning(
    content: str, sentences: list[tuple[int, int]], *name_groups: list[str], limit: int = 2
) -> list[str]:
    patterns = [_names_pattern(names) for names in name_groups]
    found = [
        _span(content, s, e) for s, e in sentences if all(p.search(content, s, e) for p in patterns)
    ]
    return found[:limit]
