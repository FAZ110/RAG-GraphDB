# RAG with GraphDB

## Development

```bash
npm install
npm start
```

Starts Neo4j, RabbitMQ and Redis in Docker, then runs locally with hot reload:

- backend (uvicorn, restarted by `watchfiles` on `.py` changes; uvicorn's own `--reload` sends Ctrl+C to the whole console on Windows and would stop everything) on http://localhost:8000
- Celery worker (restarted by `watchfiles` on `.py` changes)
- frontend (Vite HMR) on http://localhost:5173

PostgreSQL is not part of `docker-compose.yml` and must be running locally. `Ctrl+C` stops everything except the Docker containers (`docker compose stop`).
