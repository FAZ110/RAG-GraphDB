from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
import re
from dotenv import load_dotenv
from neo4j import AsyncGraphDatabase
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="Graph-LLM-JS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://127.0.0.1:1234/v1")
LM_STUDIO_API_KEY = os.getenv("LM_STUDIO_API_KEY", "lm-studio")
client = AsyncOpenAI(base_url=LM_STUDIO_URL, api_key=LM_STUDIO_API_KEY)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
    raise RuntimeError(
        "Brakuje zmiennych środowiskowych: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD"
    )

driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

_DANGEROUS_CYPHER = re.compile(
    r"\b(DETACH\s+DELETE|DELETE|DROP|REMOVE|CALL\s+apoc\.)\b",
    re.IGNORECASE,
)


def validate_cypher(cypher: str) -> None:
    match = _DANGEROUS_CYPHER.search(cypher)
    if match:
        raise HTTPException(
            status_code=422,
            detail=f"Wygenerowany kod Cypher zawiera niedozwoloną operację: '{match.group()}'",
        )


class ArticleRequest(BaseModel):
    url: str = ""
    title: str = ""
    content: str


@app.get("/")
def read_root():
    return {"status": "Server works!!!"}


@app.post("/extract")
async def extract_graph_data(request: ArticleRequest):
    prompt = f"""
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
    6. W relacjach UŻYWAJ TYLKO SAMYCH ZMIENNYCH w pojedynczych nawiasach. SUROWO ZABRONIONE jest dodawanie etykiet (np. :MIEJSCE) czy właściwości (np. {{name: ...}}) wewnątrz definicji relacji. Używaj formatu: MERGE (zmienna1)-[:RELACJA]->(zmienna2).
    7. Nazwy relacji pisz wielkimi literami z podkreślnikami, np. GRA_DLA, STRZELI_GOLA, TRENUJE.
    8. Zwróć TYLKO czysty kod Cypher, bez znaczników markdown (```cypher).

    Tytuł: {request.title}
    Treść: {request.content}
    """

    response = await client.chat.completions.create(
        model="local-model",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )

    if not response.choices:
        raise HTTPException(status_code=502, detail="Brak odpowiedzi od LM Studio")

    raw_cypher = response.choices[0].message.content
    clean_cypher = raw_cypher.replace("```cypher", "").replace("```", "").strip()

    validate_cypher(clean_cypher)

    async with driver.session() as session:
        await session.run(clean_cypher)

    return {
        "status": "Success! Graph generated and saved in Neo4j",
        "executed_code": clean_cypher,
    }
