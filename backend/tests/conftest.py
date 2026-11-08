import os

from cryptography.fernet import Fernet

# Set before anything imports core.config; load_dotenv() never overrides these,
# so backend/.env cannot point the tests at real data.
os.environ.update(
    {
        "NEO4J_URI": os.getenv("TEST_NEO4J_URI", "bolt://127.0.0.1:7688"),
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "testpassword",
        "REDIS_URL": os.getenv("TEST_REDIS_URL", "redis://127.0.0.1:6380/0"),
        "RABBITMQ_URL": "memory://",
        "SECRETS_KEY": Fernet.generate_key().decode(),
        "EMBEDDING_DIM": "8",
        "COOKIE_SECURE": "false",
        "DEV_ACCOUNTS": "false",
        "CORS_ORIGINS": "http://localhost:5173",
        "DEDUP_ENABLED": "true",
        "LLM_PROVIDER": "local",
        "EMBEDDING_PROVIDER": "local",
        # Pinned so a tuned backend/.env cannot change what the tests expect.
        "DEDUP_THRESHOLD": "0.75",
        "DEDUP_NAME_MIN_SCORE": "0.5",
        "DEDUP_LEXICAL_MIN": "0.85",
        "DEDUP_SUGGEST_MIN": "0.5",
        "DEDUP_SUGGEST_LEXICAL_MIN": "0.8",
        "DEDUP_SUGGEST_ANY_NAME_MIN": "0.9",
        "DEDUP_TOP_K": "5",
        "SESSION_TTL_HOURS": "168",
        "STALE_PROCESSING_MINUTES": "15",
    }
)
