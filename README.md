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

The first admin comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`: the API creates it at start while there is no admin, and it takes over the spaces from before accounts existed. An existing account is never promoted and the password never reset from there, so after signing in and changing the password in the app, remove `ADMIN_PASSWORD` from `.env`.

`create_admin.py` makes an admin by hand, e.g. to promote an account or to get back in when no admin can sign in:

```bash
cd backend && node ../scripts/venv.mjs python create_admin.py you@example.com
```

In Docker: `docker compose --env-file backend/.env exec backend python create_admin.py you@example.com`. Admins manage users (block, delete, access to the server's models) and registration under Administracja.
