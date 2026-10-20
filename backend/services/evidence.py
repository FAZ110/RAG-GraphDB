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
    # A lone capital is an initial ("R. Lewandowski").
    return word.casefold() in _ABBREVIATIONS or (len(word) == 1 and word.isupper())


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


def to_spans(ids: list[str], sentences: list[tuple[int, int]]) -> list[str]:
    spans = []
    for sid in ids:
        digits = sid.strip().lstrip("[Ss").rstrip("]")
        if digits.isdigit() and 1 <= int(digits) <= len(sentences):
            s, e = sentences[int(digits) - 1]
            spans.append(f"{s}:{e}")
    return list(dict.fromkeys(spans))
