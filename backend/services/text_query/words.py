import unicodedata

MIN_WORD = 3


def fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.casefold().replace("ł", "l"))
    return "".join(c for c in decomposed if not unicodedata.combining(c)).strip()


def words(text: str) -> list[str]:
    return "".join(c if c.isalnum() else " " for c in text).split()


def same_word(a: str, b: str) -> bool:
    """One word as Polish may inflect it: "Lechu" is "Lech", "członkiem" is "członem",
    "Legii" is not "Lech"."""
    a, b = fold(a), fold(b)
    if a == b:
        return True
    shortest = min(len(a), len(b))
    if shortest < MIN_WORD:
        return False
    common = next((i for i, (x, y) in enumerate(zip(a, b, strict=False)) if x != y), shortest)
    return common >= max(MIN_WORD, shortest - 2)
