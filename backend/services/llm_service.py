from openai import AsyncOpenAI
from core.config import (LLM_PROVIDER, GROQ_API_KEY, GROQ_MODEL,
    LLM_BASE_URL, LLM_API_KEY, LLM_MODEL)

_CYPHER_PROMPT = """\
Poniżej wyśle ci artykuł sportowy, twoim zadaniem jest wyekstrahować obiekty i relacje semantyczne między nimi.
Podaj odpowiedź w języku cypher abym mógł od razu wrzucić wynik do neo4j'a.
Nie zapomnij o odpowiednim nazewnictwie węzłów i relacji między nimi.

Bardzo ważne zasady:
1. Każdy węzeł MUSI posiadać właściwość 'name'. Używaj formatu: MERGE (zmienna:ETYKIETA {{name: "Pełna nazwa"}}).
2. Używaj tylko polskich, wielkich liter dla ETYKIET, np.: ZAWODNIK, DRUŻYNA, MECZ, LIGA, TRENER.
3. Zawsze najpierw twórz wszystkie węzły (każdy w osobnej linii).
4. Relacje twórz ZAWSZE na samym końcu kodu.
5. Każda linijka z relacją MUSI zaczynać się od instrukcji MERGE i zawierać dokładnie JEDNĄ relację.
   NIE ŁĄCZ wielu relacji w łańcuchy! (Źle: A-[]->B-[]->C, Dobrze: A-[]->B w jednej linii, B-[]->C w drugiej).
6. W relacjach UŻYWAJ TYLKO SAMYCH ZMIENNYCH w pojedynczych nawiasach. SUROWO ZABRONIONE jest dodawanie etykiet \
(np. :MIEJSCE) czy właściwości (np. {{name: ...}}) wewnątrz definicji relacji. \
Używaj formatu: MERGE (zmienna1)-[:RELACJA]->(zmienna2).
7. Nazwy relacji pisz wielkimi literami z podkreślnikami, np. GRA_DLA, STRZELI_GOLA, TRENUJE.
8. Zwróć TYLKO czysty kod Cypher, bez znaczników markdown (```cypher).

Tytuł: {title}
Treść: {content}\
"""


class LLMService:
    def __init__(self) -> None:
        if LLM_PROVIDER == "groq":
            if not GROQ_API_KEY:
                raise ValueError("No GROQ_API_KEY in environmental variables")
            self._client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY
            )
            self._model = GROQ_MODEL
            print(f"ZAINICJALIZOWANO LLM: Groq (Model: {self._model})")

        else:
            self._client = AsyncOpenAI(
                base_url=LLM_BASE_URL,
                api_key=LLM_API_KEY
            )
            self._model = LLM_MODEL
            print(f"ZAINICJALIZOWANO LLM: Lokalne (Model: {self._model})")


    async def generate_cypher(self, title: str, content: str) -> str:
        prompt = _CYPHER_PROMPT.format(title=title, content=content)
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        if not response.choices:
            raise ValueError("Missing response from LLM")
        raw = response.choices[0].message.content

        if not raw:
            return ""
        
        return raw.replace("```cypher", "").replace("```", "").strip()
