# Długie 'processing' = worker padł lub zabił go time_limit, więc wynik nigdy nie zostanie zapisany.
_FAILED_WHERE = """
a.space_id = $space_id AND (
    a.status = 'error'
    OR (a.status = 'processing'
        AND a.started_at < datetime() - duration({minutes: $stale_min}))
)
"""

ARTICLE_SCHEMA_CYPHER = [
    "CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE",
    "CREATE INDEX article_space_status IF NOT EXISTS FOR (a:Article) ON (a.space_id, a.status)",
]

CREATE_ARTICLES_CYPHER = """
UNWIND $articles AS art
CREATE (:Article {
    id: art.id, space_id: $space_id, title: art.title, content: art.content,
    provider: $provider, status: 'queued'
})
"""

FAILED_ARTICLES_CYPHER = f"""
MATCH (a:Article)
WHERE {_FAILED_WHERE}
RETURN a.id AS id,
       a.title AS title,
       CASE a.status
           WHEN 'processing' THEN 'Processing took too long, the worker probably died'
           ELSE a.error
       END AS error,
       toString(a.started_at) AS started_at
ORDER BY started_at DESC
"""

# SET/REMOVE _lock bierze blokadę zapisu, a drugi WHERE sprawdza status już pod nią (brak podwójnego ponowienia).
CLAIM_FOR_RETRY_CYPHER = f"""
MATCH (a:Article)
WHERE ($ids IS NULL OR a.id IN $ids) AND {_FAILED_WHERE}
SET a._lock = true
REMOVE a._lock
WITH a
WHERE {_FAILED_WHERE}
SET a.status = 'queued', a.error = null
RETURN a.id AS id, a.provider AS provider
"""

MARK_PROCESSING_CYPHER = """
MATCH (a:Article {id: $id})
SET a.status = 'processing', a.started_at = datetime()
RETURN a.title AS title, a.content AS content
"""

MARK_RESULT_CYPHER = """
MATCH (a:Article {id: $id})
SET a.status = $status, a.error = $error
"""
