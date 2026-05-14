import os
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "local")
LLM_API_KEY = os.getenv("LLM_API_KEY", "lm-studio")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://127.0.0.1:1234/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "local-model")

if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
    raise RuntimeError("Brakuje zmiennych środowiskowych: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD")
