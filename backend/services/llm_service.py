import json
import re

from openai import OpenAI

from core.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)

_GROQ_MAX_COMPLETION_TOKENS = 8000

_GRAPH_JSON_PROMPT = """\
Poniżej wyśle ci tekst, twoim zadaniem jest wyekstrahować encje i relacje semantyczne między nimi.
Zwróć odpowiedź WYŁĄCZNIE jako poprawny JSON (bez żadnych znaczników markdown, bez ```json).
JSON musi zawierać dwa klucze: "nodes" i "edges".

Format węzła:
{{"id": "unikalny_id", "label": "ETYKIETA", "type": "TYP", "aliases":["Inna nazwa z tekstu"], "evidence": ["S1"], "properties": {{"name": "Pełna nazwa", "description": "Krótki opis"}}}}

Format krawędzi:
{{"source": "id_węzła", "target": "id_węzła", "type": "TYP_RELACJI", "evidence": ["S2"], "properties": {{}}}}

Bardzo ważne zasady:
1. Dobierz etykiety (label) odpowiednio do domeny tekstu (np. OSOBA, ORGANIZACJA, MIEJSCE, WYDARZENIE lub inne pasujące).
   Etykiety pisz wielkimi literami, np. OSOBA, FIRMA, PRODUKT.
   Etykieta to rodzaj bytu (jedno słowo lub słowa połączone podkreślnikiem, np. KLUB,
   ZAWODNIK, KLUB_PIŁKARSKI), NIGDY jego nazwa: "KLUB", nie "KLUB AC MILAN".
2. Każdy węzeł MUSI mieć właściwość "name" z pełną nazwą encji w mianowniku
   liczby pojedynczej (np. "Wisła Kraków", nie "Wiśle Kraków"; "Aston Villa",
   nie "Aston Villę"). Osoby zapisuj jako imię i nazwisko, jeśli tekst je podaje.
   Ten sam byt w całym tekście musi mieć dokładnie tę samą nazwę.
   W "name" podawaj zawsze pełną, oficjalną nazwę, także gdy tekst używa skrótu lub przezwiska
   (np. "Robert Lewandowski", nie "Lewy"; "Paris Saint-Germain", nie "PSG").
   Skróty, przezwiska i inne warianty nazwy użyte w tekście wpisz do listy "aliases"
   (pusta lista, jeśli ich nie ma).
3. Pole "id" to wewnętrzny identyfikator do budowania relacji (np. "p1", "org_microsoft").
4. Typy relacji pisz WYŁĄCZNIE po polsku, wielkimi literami z podkreślnikami,
   np. PRACUJE_W, JEST_CZĘŚCIĄ, POSIADA, GRA_W, CHWALI. Nie używaj angielskich typów
   (np. PLAYS_FOR, PRAISES, INTERVIEWED_BY) - także gdy tekst zawiera angielskie nazwy.
5. Pola "source" i "target" MUSZĄ odpowiadać istniejącym "id" węzłów.
6. Każdy węzeł MUSI mieć właściwość "description": jedno krótkie zdanie (do 15 słów)
   mówiące, kim lub czym jest ten byt, na podstawie tekstu (np. "klub piłkarski z Poznania
   grający w Ekstraklasie", "napastnik reprezentacji Polski"). Opisuj sam byt, nie wydarzenia
   z artykułu.
7. Każdy węzeł MUSI mieć pole "type" — ogólny rodzaj bytu, DOKŁADNIE jedna z wartości:
   OSOBA, ORGANIZACJA (firmy, kluby, drużyny, reprezentacje, instytucje),
   MIEJSCE (kraje, miasta, regiony, obiekty), WYDARZENIE (mecze, turnieje, ligi,
   rozgrywki, konferencje), PRODUKT (produkty, dzieła, technologie), POJĘCIE (pozostałe).
   Przykład: {{"label": "KLUB", "type": "ORGANIZACJA", ...}},
   {{"label": "ZAWODNIK", "type": "OSOBA", ...}}, {{"label": "LIGA", "type": "WYDARZENIE", ...}}.
8. Treść jest podzielona na zdania, każde poprzedzone identyfikatorem w nawiasie, np. [S3].
   Każdy węzeł i każda krawędź MUSI mieć pole "evidence": lista 1-2 identyfikatorów zdań
   (np. ["S3"]), które najlepiej uzasadniają ten byt lub tę relację. Podawaj wyłącznie
   identyfikatory istniejące w treści.
9. Zwróć TYLKO surowy JSON — bez komentarzy, bez tekstu poza JSON.

Tytuł: {title}
Treść: {content}\
"""


class LLMService:
    def __init__(self, provider: str = "local") -> None:
        self._extra: dict = {}

        if provider == "groq":
            if not GROQ_API_KEY:
                raise ValueError("No GROQ_API_KEY in environmental variables")
            self._client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY,
                max_retries=0,
            )
            self._model = GROQ_MODEL
            self._extra = {
                "max_completion_tokens": _GROQ_MAX_COMPLETION_TOKENS,
                "reasoning_effort": "low",
                "response_format": {"type": "json_object"},
            }
        elif provider == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("No OPENAI_API_KEY in environmental variables")
            self._client = OpenAI(api_key=OPENAI_API_KEY, max_retries=0)
            self._model = OPENAI_MODEL
            self._extra = {"response_format": {"type": "json_object"}}
        else:
            self._client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY, max_retries=0)
            self._model = LLM_MODEL

        print(f"Initialized with: {self._model}")

    def generate_graph_json(self, title: str, content: str) -> dict:
        prompt = _GRAPH_JSON_PROMPT.format(title=title, content=content)
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            **self._extra,
        )
        if not response.choices:
            raise ValueError("Missing response from LLM")
        choice = response.choices[0]
        raw = choice.message.content

        if choice.finish_reason == "length":
            raise ValueError(
                "LLM response was truncated (finish_reason=length) — "
                "article too long or token limit too low"
            )

        if not raw:
            raise ValueError("Empty response from LLM")

        cleaned = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}") from e
