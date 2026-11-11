// name: upsert_article
// scope: space
MERGE (a:Article {space_id: $space_id, source_key: $source_key})
ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
WITH a, coalesce(a.processed_hash = $content_hash AND a.status = 'ok', false) AND NOT $force
     AS unchanged
SET a.url = $url,
    a.title = $title,
    a.content = $content,
    a.content_hash = $content_hash,
    a.updated_at = datetime(),
    a.status = CASE WHEN unchanged THEN a.status ELSE 'pending' END,
    a.error = CASE WHEN unchanged THEN a.error ELSE null END,
    a.provider = CASE WHEN unchanged THEN a.provider ELSE $provider END,
    a.queued_at = CASE WHEN unchanged THEN a.queued_at ELSE datetime() END,
    a.queue_token = CASE WHEN unchanged THEN a.queue_token ELSE randomUUID() END
RETURN a.id AS id, unchanged, a.nodes_count AS nodes_count, a.edges_count AS edges_count,
       a.queue_token AS token

// name: start_article
// scope: system
// The token is the task's: a task left in the queue after a pause, cancel or newer upload no
// longer matches, so it does nothing. `processing` is accepted for a task's own retries.
MATCH (a:Article {id: $article_id})
WITH a, a.status IN ['pending', 'processing'] AND a.queue_token = $token AS runnable
SET a.status = CASE WHEN runnable THEN 'processing' ELSE a.status END,
    a.started_at = CASE WHEN runnable THEN datetime() ELSE a.started_at END
WITH a, runnable
OPTIONAL MATCH (s:Space {id: a.space_id})
OPTIONAL MATCH (u:User {id: s.owner_id})
RETURN a.id AS id,
       runnable,
       a.space_id AS space_id,
       s.owner_id AS owner_id,
       coalesce(u.server_models AND NOT u.disabled, false) AS server_models,
       a.title AS title,
       a.content AS content,
       a.content_hash AS content_hash,
       s.extraction_rules AS rules,
       s.extraction_labels AS labels

// name: finish_article
// scope: space
// A newer text may have been uploaded while this one was processing; the article then
// stays pending for the task that handles the newer text.
MATCH (a:Article {id: $article_id, space_id: $space_id})
SET a.processed_hash = $content_hash,
    a.processed_at = datetime(),
    a.nodes_count = $nodes_count,
    a.edges_count = $edges_count,
    a.error = null,
    a.status = CASE WHEN a.content_hash = $content_hash THEN 'ok' ELSE a.status END

// name: still_running
// scope: space
// Taken under the article's write lock, so a pause or cancel lands either before the check
// (the result is dropped) or after the write.
MATCH (a:Article {id: $article_id, space_id: $space_id})
SET a._lock = true
REMOVE a._lock
RETURN a.status = 'processing' AND a.queue_token = $token AS running

// name: fail_article
// scope: system
// Reported when the task still owns the article, or when the article is gone.
OPTIONAL MATCH (a:Article {id: $article_id})
WITH a, a IS NOT NULL AND a.status = 'processing' AND a.queue_token = $token AS mine
FOREACH (_ IN CASE WHEN mine THEN [1] ELSE [] END | SET a.status = 'error', a.error = $error)
RETURN a IS NULL OR mine AS report

// name: release_article_relationships
// scope: space
// An article only connects entities it mentions, so its relationships are reached
// through its MENTIONS instead of scanning the whole space.
MATCH (:Article {id: $article_id, space_id: $space_id})-[:MENTIONS]->(:Entity)-[r]-(:Entity)
WHERE $article_id IN coalesce(r.article_ids, [])
WITH DISTINCT r
SET r.article_ids = [i IN r.article_ids WHERE i <> $article_id],
    r.evidence = [s IN coalesce(r.evidence, []) WHERE NOT s STARTS WITH $article_id + ':']
WITH r
// Hand-made relationships stay once no article backs them.
WHERE size(r.article_ids) = 0 AND NOT coalesce(r.manual, false)
DELETE r

// name: release_article_mentions
// scope: space
MATCH (:Article {id: $article_id, space_id: $space_id})-[m:MENTIONS]->(e:Entity)
DELETE m
WITH DISTINCT e
// Entities made, edited or linked by hand stay without mentions.
WHERE NOT (:Article)-[:MENTIONS]->(e)
  AND NOT coalesce(e.manual, false)
  AND NOT EXISTS { (e)-[r]-(:Entity) WHERE r.manual }
DETACH DELETE e

// name: list_articles
// scope: space
MATCH (a:Article {space_id: $space_id})
RETURN a.id AS id,
       a.url AS url,
       a.title AS title,
       a.status AS status,
       a.error AS error,
       a.nodes_count AS nodes_count,
       a.edges_count AS edges_count,
       a.created_at AS created_at,
       a.processed_at AS processed_at,
       a.batch_id AS batch_id
ORDER BY a.created_at DESC

// name: article_statuses
// scope: space
MATCH (a:Article {space_id: $space_id})
WHERE a.id IN $article_ids
RETURN a.id AS id, a.status AS status

// name: delete_article
// scope: space
MATCH (a:Article {id: $article_id, space_id: $space_id})
DETACH DELETE a

// name: get_article
// scope: space
// Relationships are this article's when it is among the articles backing them.
MATCH (a:Article {id: $article_id, space_id: $space_id})
CALL (a) {
  OPTIONAL MATCH (a)-[m:MENTIONS]->(e:Entity)
  WITH e, m
  ORDER BY e.label, e.name
  RETURN collect(CASE WHEN e IS NULL THEN null ELSE {
           id: e.id, name: e.name, label: e.label,
           spans: [s IN coalesce(m.spans, []) | [x IN split(s, ':') | toInteger(x)]]
         } END) AS entities
}
CALL (a) {
  OPTIONAL MATCH (a)-[:MENTIONS]->(s:Entity)-[r]->(t:Entity)
  WHERE a.id IN r.article_ids
  WITH s, r, t
  ORDER BY s.name, type(r), t.name
  RETURN collect(CASE WHEN r IS NULL THEN null ELSE {
           id: elementId(r),
           source: s.name, source_label: s.label,
           type: type(r),
           target: t.name, target_label: t.label,
           spans: [ev IN coalesce(r.evidence, []) WHERE ev STARTS WITH a.id + ':' |
                   [x IN split(substring(ev, size(a.id) + 1), ':') | toInteger(x)]]
         } END) AS relationships
}
RETURN a.id AS id,
       a.url AS url,
       a.title AS title,
       a.status AS status,
       a.error AS error,
       a.nodes_count AS nodes_count,
       a.edges_count AS edges_count,
       a.created_at AS created_at,
       a.processed_at AS processed_at,
       a.content AS content,
       entities,
       relationships

// name: fail_stalled_in_space
// scope: space
// A task that died (worker, broker or Redis down) never reports back, so an article waiting or
// processing longer than any task takes is marked failed and can be retried.
MATCH (a:Article {space_id: $space_id})
WHERE ((a.status = 'pending' AND a.queued_at < datetime() - duration({minutes: $stale_minutes}))
    OR (a.status = 'processing'
      AND a.started_at < datetime() - duration({minutes: $stale_minutes})))
SET a.error = CASE a.status
                WHEN 'pending' THEN 'Article was never picked up by a worker'
                ELSE 'Processing took too long, the worker probably died'
              END,
    a.status = 'error'

// name: fail_stalled_of_owner
// scope: owner
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {space_id: s.id})
WHERE ((a.status = 'pending' AND a.queued_at < datetime() - duration({minutes: $stale_minutes}))
    OR (a.status = 'processing'
      AND a.started_at < datetime() - duration({minutes: $stale_minutes})))
SET a.error = CASE a.status
                WHEN 'pending' THEN 'Article was never picked up by a worker'
                ELSE 'Processing took too long, the worker probably died'
              END,
    a.status = 'error'

// name: claim_for_retry
// scope: space
// Taking the write lock first and checking the status again under it keeps two requests
// from queueing the same article twice.
MATCH (a:Article {space_id: $space_id})
WHERE a.status = $status AND ($article_ids IS NULL OR a.id IN $article_ids)
SET a._lock = true
REMOVE a._lock
WITH a
WHERE a.status = $status
SET a.status = 'pending', a.error = null, a.queued_at = datetime(), a.queue_token = randomUUID()
RETURN a.id AS id, a.title AS title, a.provider AS provider, a.queue_token AS token

// name: search_articles
// scope: owner
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {space_id: s.id})
WHERE toLower(coalesce(a.title, '')) CONTAINS toLower($q)
   OR toLower(coalesce(a.url, '')) CONTAINS toLower($q)
RETURN a.id AS id, a.title AS title, a.url AS url, a.space_id AS space_id, s.name AS space_name
ORDER BY a.created_at DESC
LIMIT $limit
