// name: upsert_article
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
    a.error = CASE WHEN unchanged THEN a.error ELSE null END
RETURN a.id AS id, unchanged, a.nodes_count AS nodes_count, a.edges_count AS edges_count

// name: start_article
MATCH (a:Article {id: $article_id})
SET a.status = 'processing'
RETURN a.id AS id,
       a.space_id AS space_id,
       a.title AS title,
       a.content AS content,
       a.content_hash AS content_hash

// name: finish_article
// A newer text may have been uploaded while this one was processing; the article then
// stays pending for the task that handles the newer text.
MATCH (a:Article {id: $article_id})
SET a.processed_hash = $content_hash,
    a.processed_at = datetime(),
    a.nodes_count = $nodes_count,
    a.edges_count = $edges_count,
    a.error = null,
    a.status = CASE WHEN a.content_hash = $content_hash THEN 'ok' ELSE a.status END

// name: fail_article
MATCH (a:Article {id: $article_id})
SET a.status = 'error', a.error = $error

// name: release_article_relationships
// An article only connects entities it mentions, so its relationships are reached
// through its MENTIONS instead of scanning the whole space.
MATCH (:Article {id: $article_id})-[:MENTIONS]->(:Entity)-[r]-(:Entity)
WHERE $article_id IN coalesce(r.article_ids, [])
WITH DISTINCT r
SET r.article_ids = [i IN r.article_ids WHERE i <> $article_id]
WITH r
WHERE size(r.article_ids) = 0
DELETE r

// name: release_article_mentions
MATCH (:Article {id: $article_id})-[m:MENTIONS]->(e:Entity)
DELETE m
WITH DISTINCT e
WHERE NOT (:Article)-[:MENTIONS]->(e)
DETACH DELETE e

// name: list_articles
MATCH (a:Article {space_id: $space_id})
RETURN a.id AS id,
       a.url AS url,
       a.title AS title,
       a.status AS status,
       a.error AS error,
       a.nodes_count AS nodes_count,
       a.edges_count AS edges_count,
       a.created_at AS created_at,
       a.processed_at AS processed_at
ORDER BY a.created_at DESC

// name: article_statuses
MATCH (a:Article {space_id: $space_id})
WHERE a.id IN $article_ids
RETURN a.id AS id, a.status AS status

// name: delete_article
MATCH (a:Article {id: $article_id})
DETACH DELETE a

// name: get_article
// Relationships are this article's when it is among the articles backing them.
MATCH (a:Article {id: $article_id, space_id: $space_id})
CALL (a) {
  OPTIONAL MATCH (a)-[:MENTIONS]->(e:Entity)
  WITH e
  ORDER BY e.label, e.name
  RETURN [x IN collect(e) | {name: x.name, label: x.label}] AS entities
}
CALL (a) {
  OPTIONAL MATCH (a)-[:MENTIONS]->(s:Entity)-[r]->(t:Entity)
  WHERE a.id IN r.article_ids
  WITH s, r, t
  ORDER BY s.name, type(r), t.name
  RETURN collect(CASE WHEN r IS NULL THEN null ELSE {
           source: s.name, source_label: s.label,
           type: type(r),
           target: t.name, target_label: t.label
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
