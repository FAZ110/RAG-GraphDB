from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

app = FastAPI(title="Graph-LLM-JS API")


client = OpenAI(base_url="http://127.0.0.1:1234/v1", api_key="lm-studio")


NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


class ArticleRequest(BaseModel):
    text: str


@app.get("/")
def read_root():
    return {"status": "Serwer działa! Możemy brać się za AI i grafy."}


@app.post("/extract")
def extract_graph_data(request: ArticleRequest):

    prompt = f"""
    Poniżej wyśle ci artykuł, twoim zadaniem jest wyekstrahować obiekty i relacje semantyczne między nimi.
    Podaj odpowiedź w języku cypher abym mógł od razu wrzucić wynik do neo4j'a.
    Nie zapomnij o odpowiednim nazewnictwie węzłów i relacji między nimi.
    
    Bardzo ważne zasady:
    1. Każdy węzeł MUSI posiadać właściwość 'name'. Używaj formatu: MERGE (zmienna:ETYKIETA {{name: "Pełna nazwa"}}).
    2. Używaj tylko polskich, wielkich liter dla ETYKIET, np.: ZAWODNIK, DRUŻYNA.
    3. Zawsze najpierw twórz wszystkie węzły (każdy w osobnej linii).
    4. Relacje twórz ZAWSZE na samym końcu kodu.
    5. Każda linijka z relacją MUSI zaczynać się od instrukcji MERGE i zawierać dokładnie JEDNĄ relację. 
       NIE ŁĄCZ wielu relacji w łańcuchy! (Źle: A-[]->B-[]->C, Dobrze: A-[]->B w jednej linii, B-[]->C w drugiej).
    6. W relacjach UŻYWAJ TYLKO SAMYCH ZMIENNYCH w pojedynczych nawiasach. SUROWO ZABRONIONE jest dodawanie etykiet (np. :MIEJSCE) czy właściwości (np. {{name: ...}}) wewnątrz definicji relacji. Używaj formatu: MERGE (zmienna1)-[:RELACJA]->(zmienna2).
    7. Nazwy relacji pisz wielkimi literami z podkreślnikami, np. GRA_DLA.
    8. Zwróć TYLKO czysty kod Cypher, bez znaczników markdown (```cypher).

    Artykuł:
    {request.text}
    """

    try:
        response = client.chat.completions.create(
            model="local-model",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )

        if not response.choices or response.choices is None:
            return {"error": "Brak odpowiedzi od LM Studio"}
        
        raw_cypher = response.choices[0].message.content

        clean_cypher = raw_cypher.replace("```cypher", "").replace("```", "").strip()

        with driver.session() as session:
            session.run(clean_cypher)

        return {
            "status": "Sukces! Graf został wygenerowany i zapisany w Neo4j.",
            "wykonany_kod": clean_cypher
        }
    except Exception as e:
        print("BŁĄD:", e)
        return {"error": f"Wystąpił problem: {str(e)}"}
