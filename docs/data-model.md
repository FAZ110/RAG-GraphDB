# Model danych

> Kontrakt danych backendu: gdzie i w jakiej postaci przechowujemy dane.
> Elementy oznaczone **(planowane)** to ustalenia dla kolejnych zadań.

1. [Zasady](#1-zasady)
2. [Przepływ ekstrakcji](#2-przepływ-ekstrakcji)
3. [PostgreSQL](#3-postgresql)
4. [Neo4j](#4-neo4j)
5. [Kontrakt API](#5-kontrakt-api)
6. [Konwencje](#6-konwencje)
7. [Uruchomienie](#7-uruchomienie)

---

## 1. Zasady

> **Ważne:** **PostgreSQL jest źródłem prawdy, Neo4j jest bazą wyliczaną.**
> Graf przestrzeni można w całości odbudować z PostgreSQL. Wyjątek: widoki, bo są pracą użytkownika.

- **Ekstrakcja odbywa się raz na artykuł.** Przestrzenie powstają z zapisanych wzmianek, bez ponownego wywołania LLM.
- **Identyfikatory to UUID**, w API przesyłane jako tekst. `elementId` z Neo4j nie jest trwałym identyfikatorem.
- **Zapytania grafowe działają w obrębie jednej przestrzeni** i przyjmują `space_id` (planowane).

---

## 2. Przepływ ekstrakcji

> Od wysłania artykułów przez frontend do wyniku w strumieniu postępu. Linie ciągłe to zapytania, przerywane to odpowiedzi.

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI
    participant PG as PostgreSQL
    participant MQ as RabbitMQ
    participant W as Worker Celery
    participant AI as LLM i embeddingi
    participant R as Redis

    FE->>API: POST /extract (artykuły)
    API->>PG: zapis artykułów (status: pending)
    API->>MQ: zadanie dla każdego artykułu
    API-->>FE: job_id
    FE->>API: GET /extract/stream/{job_id}

    MQ->>W: zadanie
    W->>PG: status: processing
    W->>AI: treść artykułu
    AI-->>W: węzły i krawędzie
    W->>AI: nazwy węzłów
    AI-->>W: embeddingi
    W->>PG: mentions, mention_relations, status: ok / error
    W->>R: wynik i powiadomienie
    R-->>API: nowy wynik
    API-->>FE: SSE: wynik artykułu
```

---

## 3. PostgreSQL

### 3.1 Biblioteka artykułów

```mermaid
erDiagram
    articles ||--o{ mentions : ""
    articles ||--o{ mention_relations : ""
    mentions ||--o{ mention_relations : ""

    articles {
        uuid id PK
        text title
        text url "NULL, gdy brak"
        text content
        varchar content_hash "SHA-256"
        varchar status "pending | processing | ok | error"
        text error
        timestamptz created_at
        timestamptz updated_at
    }
    mentions {
        uuid id PK
        uuid article_id FK
        text name
        text label
        vector embedding "vector(1536)"
    }
    mention_relations {
        uuid id PK
        uuid article_id FK
        uuid src_mention_id FK
        uuid dst_mention_id FK
        text type
    }
```

| Temat | Zasada |
|---|---|
| Wzmianka | encja tak, jak LLM wyciągnął ją z jednego artykułu; jedna na encję w artykule; nie jest scalana |
| Status | `pending` → `processing` → `ok` / `error`; do przestrzeni trafiają tylko artykuły `ok` |
| Ponowne przetworzenie | zastępuje poprzedni wynik w jednej transakcji, bez duplikatów |
| Identyfikatory od LLM | `"p1"` itp. tylko łączą krawędzie z węzłami i nie są przechowywane |
| Usunięcie artykułu | kaskadowo usuwa jego wzmianki i relacje |

> **Uwaga:** Artykuł ze statusem `error` może mieć wzmianki z wcześniejszego, udanego przetworzenia. O użyciu artykułu decyduje status, a nie obecność wzmianek.

### 3.2 Przestrzenie i encje (planowane)

> Przestrzeń to zbiór artykułów z własnym, odizolowanym grafem encji. Ta sama nazwa w dwóch przestrzeniach to dwie niezależne encje.

| Tabela | Kolumny | Uwagi |
|---|---|---|
| `spaces` | `id`, `name`, `created_at` | |
| `space_articles` | `space_id`, `article_id` | |
| `entities` | `id`, `space_id`, `name`, `label` | `id` jest stałe: używane w Neo4j, widokach i API |
| `space_entity_mentions` | `space_id`, `mention_id`, `entity_id` | w danej przestrzeni wzmianka należy do jednej encji |

- Krawędzie między encjami nie są przechowywane w PostgreSQL; wynikają z `mention_relations` i przypisania wzmianek do encji.

> **Wskazówka:** Przy pełnym przeliczeniu przestrzeni nowa encja dziedziczy `id` starej, z którą dzieli najwięcej wzmianek. Dzięki temu widoki użytkownika pozostają poprawne.

---

## 4. Neo4j

### 4.1 Graf przestrzeni (planowane)

```mermaid
flowchart LR
    V(["View<br/><i>Polscy naukowcy</i>"]) -->|"INCLUDES"| A(("Entity<br/><i>Maria Skłodowska-Curie</i>"))
    V -->|"INCLUDES"| B(("Entity<br/><i>Warszawa</i>"))
    A -->|"URODZIŁA_SIĘ_W"| B
```

| Element | Rodzaj | Właściwości |
|---|---|---|
| `Entity` | węzeł | `id`, `space_id`, `name`, `label` |
| `TYP_RELACJI` | krawędź między encjami, np. `URODZIŁ_SIĘ_W` | `source_article_ids`, `mention_relation_ids` |
| `View` | węzeł | `id`, `space_id`, `name` |
| `INCLUDES` | krawędź od widoku do encji | |

> Przykład: widok „Polscy naukowcy” zawiera dwie encje połączone relacją. `Entity.id` to `entities.id` z PostgreSQL, a widoki przechowują wyłącznie odnośniki do encji.

### 4.2 Stan obecny

> **Ostrzeżenie:** Do czasu wdrożenia przestrzeni worker zapisuje ekstrakcję bezpośrednio do Neo4j, scalając węzły po nazwie w jednym globalnym grafie. Ten zapis zostanie usunięty, gdy zastąpią go grafy przestrzeni.

---

## 5. Kontrakt API

### 5.1 Odnośnik do źródła (planowane)

> Encja lub krawędź wskazuje artykuły źródłowe w tej postaci; treść artykułu pobiera się osobno po `article_id`.

```json
{ "article_id": "3f1c2a9e-…", "title": "Maria Skłodowska-Curie", "url": "https://…" }
```

### 5.2 Wynik ekstrakcji w strumieniu

`GET /extract/stream/{job_id}`, zdarzenie `result`: `title`, `status` (`ok` / `error`), `nodes`, `edges`, `nodes_count`, `edges_count`, `error`.

---

## 6. Konwencje

### 6.1 Migracje

Każda zmiana schematu to migracja Alembic, przejrzana przed commitem. Migracje wykonują się przy starcie backendu.

```bash
alembic revision --autogenerate -m "opis zmiany"
```

> **Uwaga:** Migracji, które trafiły na GitHuba, nie edytujemy; każda zmiana schematu to nowa migracja.

### 6.2 Nazwy ograniczeń

`pk_<tabela>`, `fk_<tabela>_<kolumna>_<tabela docelowa>`, `ix_<tabela>_<kolumna>`, `ck_<tabela>_<nazwa>`

### 6.3 Wartości z zamkniętej listy

`StrEnum` zapisywany jako `varchar` z ograniczeniem `CHECK`, a nie natywny enum PostgreSQL.

> **Uwaga:** Nowa wartość wymaga ręcznej migracji zmieniającej `CHECK`; autogenerate jej nie wykryje.

### 6.4 Modele

Jeden model na plik w `db/postgres/models/`.

> **Ważne:** Każdy nowy model musi być zaimportowany w `models/__init__.py`, inaczej Alembic go nie zobaczy.

---

## 7. Uruchomienie

> Co trzeba zrobić po pobraniu zmian z PostgreSQL, żeby uruchomić projekt lokalnie.

### 7.1 Zmienne środowiskowe

Nowa zmienna w `backend/.env` (wzór w `backend/.env.example`):

| Zmienna | Backend lokalnie | Backend w Dockerze |
|---|---|---|
| `POSTGRES_URL` | `postgresql+psycopg://graphdb_app:graphdb_dev_password@localhost:5432/article_library` | to samo, ale z hostem `postgres` zamiast `localhost` |

> **Uwaga:** brak `POSTGRES_URL` w `.env` oznacza wartość domyślną dla uruchomienia lokalnego (`localhost`). Login, hasło i nazwa bazy są ustawione w serwisie `postgres` w `docker-compose.yml`.

### 7.2 Kroki

1. Zainstaluj nowe zależności (w katalogu `backend`, z aktywnym venv):

   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   ```

2. Uruchom bazy i kolejki:

   ```bash
   docker compose up -d neo4j postgres rabbitmq redis
   ```

3. Uruchom backend. Migracje wykonają się automatycznie przy starcie.

   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Uruchom worker:

   ```bash
   celery -A celery_app worker --loglevel=info --pool=threads --concurrency=2
   ```

> **Ważne:** na macOS worker musi działać z `--pool=threads`. Domyślna pula `prefork` nie inicjalizuje tam poprawnie procesów i każde zadanie kończy się błędem `not enough values to unpack`. W Dockerze (Linux) opcja nie jest potrzebna.

### 7.3 Podgląd bazy

```bash
docker compose exec postgres psql -U graphdb_app -d article_library -c "select title, status, error from articles"
```
