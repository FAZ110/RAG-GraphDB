# Za długo w 'queued'/'processing' = zadanie zginęło (broker/Redis padł, worker padł lub time_limit),
# więc wynik nigdy nie zostanie zapisany. Każdy status ma własny znacznik czasu.
_FAILED_WHERE = """
a.space_id = $space_id AND (
    a.status = 'error'
    OR (a.status IN ['queued', 'processing']
        AND CASE a.status WHEN 'queued' THEN a.queued_at ELSE a.started_at END
            < datetime() - duration({minutes: $stale_min}))
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
    provider: $provider, status: 'queued', queued_at: datetime()
})
"""

FAILED_ARTICLES_CYPHER = f"""
MATCH (a:Article)
WHERE {_FAILED_WHERE}
RETURN a.id AS id,
       a.title AS title,
       CASE a.status
           WHEN 'queued' THEN 'Article was never picked up by a worker'
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
SET a.status = 'queued', a.error = null, a.queued_at = datetime()
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
