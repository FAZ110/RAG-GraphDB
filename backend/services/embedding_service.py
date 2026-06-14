from openai import OpenAI

from core.config import (
    EMBEDDING_API_KEY,
    EMBEDDING_BASE_URL,
    EMBEDDING_MODEL,
    EMBEDDING_PROVIDER,
    OPENAI_API_KEY,
)


class EmbeddingService:
    def __init__(self, provider: str = "local") -> None:
        if provider == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("No OPENAI_API_KEY in environmental variables")
            self._client = OpenAI(api_key=OPENAI_API_KEY, max_retries=0)
        else:
            self._client = OpenAI(
                base_url=EMBEDDING_BASE_URL,
                api_key=EMBEDDING_API_KEY,
                max_retries=0,
            )
        self._model = EMBEDDING_MODEL
        print(f"Initialized embedding service with: {self._model}")

    def embed(self, text: str) -> list[float]:
        response = self._client.embeddings.create(model=self._model, input=text)
        return response.data[0].embedding

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]


_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService(provider=EMBEDDING_PROVIDER)
    return _service
