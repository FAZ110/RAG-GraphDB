import json
import re

from openai import OpenAI

from core.config import GROQ_API_KEY, GROQ_MODEL, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER

_GRAPH_JSON_PROMPT = """\
Poniżej wyśle ci tekst, twoim zadaniem jest wyekstrahować encje i relacje semantyczne między nimi.
Zwróć odpowiedź WYŁĄCZNIE jako poprawny JSON (bez żadnych znaczników markdown, bez ```json).
JSON musi zawierać dwa klucze: "nodes" i "edges".

Format węzła:
{{"id": "unikalny_id", "label": "ETYKIETA", "properties": {{"name": "Pełna nazwa"}}}}

Format krawędzi:
{{"source": "id_węzła", "target": "id_węzła", "type": "TYP_RELACJI", "properties": {{}}}}

Bardzo ważne zasady:
1. Dobierz etykiety (label) odpowiednio do domeny tekstu (np. OSOBA, ORGANIZACJA, MIEJSCE, WYDARZENIE lub inne pasujące).
   Etykiety pisz wielkimi literami, np. OSOBA, FIRMA, PRODUKT.
2. Każdy węzeł MUSI mieć właściwość "name" z pełną nazwą encji.
3. Pole "id" to wewnętrzny identyfikator do budowania relacji (np. "p1", "org_microsoft").
4. Typy relacji pisz wielkimi literami z podkreślnikami, np. PRACUJE_W, JEST_CZĘŚCIĄ, POSIADA.
5. Pola "source" i "target" MUSZĄ odpowiadać istniejącym "id" węzłów.
6. Zwróć TYLKO surowy JSON — bez komentarzy, bez tekstu poza JSON.

Tytuł: {title}
Treść: {content}\
"""


class LLMService:
    def __init__(self) -> None:
        if LLM_PROVIDER == "groq":
            if not GROQ_API_KEY:
                raise ValueError("No GROQ_API_KEY in environmental variables")
            self._client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY,
                max_retries=0,
            )
            self._model = GROQ_MODEL
            print(f"Initialized LLM: Groq (Model: {self._model})")

        else:
            self._client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY, max_retries=0)
            self._model = LLM_MODEL
            print(f"Initialized LLM: Local (Model: {self._model})")

    def generate_graph_json(self, title: str, content: str) -> dict:
        prompt = _GRAPH_JSON_PROMPT.format(title=title, content=content)
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        if not response.choices:
            raise ValueError("Missing response from LLM")
        raw = response.choices[0].message.content

        if not raw:
            raise ValueError("Empty response from LLM")

        cleaned = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON: {e}") from e
