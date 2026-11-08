from services.evidence import numbered, split_sentences, to_spans


def test_split_sentences_two_sentences():
    assert split_sentences("Ala ma kota. Kot ma Alę.") == [(0, 12), (13, 24)]


def test_split_sentences_keeps_abbreviation_and_initial():
    text = "Spotkał dr. Nowaka i R. Lewandowskiego. Potem wyszedł."
    assert len(split_sentences(text)) == 2


def test_split_sentences_blank_line_is_boundary():
    assert len(split_sentences("Nagłówek\n\nTreść akapitu")) == 2


def test_split_sentences_empty_text():
    assert split_sentences("   ") == []


def test_numbered_prefixes_sentence_ids():
    text = "Ala ma kota. Kot ma Alę."
    assert numbered(text, split_sentences(text)) == "[S1] Ala ma kota.\n[S2] Kot ma Alę."


def test_to_spans_ignores_bad_ids_and_dedupes():
    text = "Ala ma kota. Kot ma Alę."
    sentences = split_sentences(text)
    assert to_spans(["S2", "[S1]", "S9", "x", "s2"], text, sentences) == ["13:24", "0:12"]


def test_to_spans_counts_utf16_units():
    # The emoji is one Python character but two UTF-16 units, as the browser counts them.
    text = "😀 Ala. Kot."
    assert to_spans(["S1"], text, split_sentences(text)) == ["0:7"]
