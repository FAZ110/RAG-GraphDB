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

The passwords of Neo4j, RabbitMQ and Redis are read from `backend/.env` (see `backend/.env.example`), so run Compose as `docker compose --env-file backend/.env ...`. Their ports listen on 127.0.0.1 only.

## Accounts

Every user sees only their own spaces, articles, analyses and custom models. The app is opened at http://localhost:5173 and calls the API under `/api` on the same origin (Vite proxy in development, nginx in Docker), which the `SameSite=Strict` session cookie needs.

Create the first admin with `create_admin.py` (it asks for the password and takes over the spaces from before accounts existed); it also promotes an existing account or gets you back in when no admin can sign in:

```bash
cd backend && node ../scripts/venv.mjs python create_admin.py you@example.com
```

In Docker: `docker compose --env-file backend/.env exec backend python create_admin.py you@example.com`.

For development, `DEV_ACCOUNTS=true` in `backend/.env` creates `admin@atlas.test`, `anna@atlas.test` and `jan@atlas.test` and lists them on the sign-in page to sign in with one click. The API refuses to start with it when `CORS_ORIGINS` names anything but localhost; never set it on a server. Admins manage users (block, delete, access to the server's models) and registration under Administracja.
