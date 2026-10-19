// name: assign_batch
UNWIND $article_ids AS article_id
MATCH (a:Article {id: article_id})
SET a.batch_id = $batch_id, a.batch_at = datetime()

// name: latest_batch_id
// An upload is the articles carrying its id; uploading an article again moves it to the new one.
MATCH (a:Article {space_id: $space_id})
WHERE a.batch_id IS NOT NULL
RETURN a.batch_id AS id
ORDER BY a.batch_at DESC
LIMIT 1

// name: running_batch_ids
MATCH (a:Article)
WHERE a.status IN ['pending', 'processing'] AND a.batch_id IS NOT NULL
RETURN DISTINCT a.batch_id AS id

// name: batch_stats
// Counts come from the articles' current status.
UNWIND $batch_ids AS id
MATCH (a:Article {batch_id: id})
WITH id, a.space_id AS space_id, collect(a) AS articles, min(a.batch_at) AS created_at
MATCH (s:Space {id: space_id})
RETURN id,
       space_id,
       s.name AS space_name,
       created_at,
       size(articles) AS total,
       size([a IN articles WHERE a.status = 'ok']) AS ok,
       size([a IN articles WHERE a.status = 'pending']) AS pending,
       size([a IN articles WHERE a.status = 'processing']) AS processing,
       size([a IN articles WHERE a.status = 'error']) AS error,
       reduce(n = 0, a IN articles | n + coalesce(a.nodes_count, 0)) AS nodes_count,
       reduce(n = 0, a IN articles | n + coalesce(a.edges_count, 0)) AS edges_count
ORDER BY created_at DESC
