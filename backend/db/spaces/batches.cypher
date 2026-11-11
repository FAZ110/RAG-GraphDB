// name: assign_batch
// scope: space
UNWIND $article_ids AS article_id
MATCH (a:Article {id: article_id, space_id: $space_id})
SET a.batch_id = $batch_id, a.batch_at = datetime()

// name: latest_batch_id
// scope: space
// An upload is the articles carrying its id; uploading an article again moves it to the new one.
MATCH (a:Article {space_id: $space_id})
WHERE a.batch_id IS NOT NULL
RETURN a.batch_id AS id
ORDER BY a.batch_at DESC
LIMIT 1

// name: running_batch_ids
// scope: owner
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {space_id: s.id})
WHERE a.status IN ['pending', 'processing'] AND a.batch_id IS NOT NULL
RETURN DISTINCT a.batch_id AS id

// name: batch_stats
// scope: owner
// Counts come from the articles' current status.
UNWIND $batch_ids AS id
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {batch_id: id, space_id: s.id})
WITH id, s, collect(a) AS articles, min(a.batch_at) AS created_at
RETURN id,
       s.id AS space_id,
       s.name AS space_name,
       created_at,
       size(articles) AS total,
       size([a IN articles WHERE a.status = 'ok']) AS ok,
       size([a IN articles WHERE a.status = 'pending']) AS pending,
       size([a IN articles WHERE a.status = 'processing']) AS processing,
       size([a IN articles WHERE a.status = 'error']) AS error,
       size([a IN articles WHERE a.status = 'paused']) AS paused,
       size([a IN articles WHERE a.status = 'cancelled']) AS cancelled,
       reduce(n = 0, a IN articles | n + coalesce(a.nodes_count, 0)) AS nodes_count,
       reduce(n = 0, a IN articles | n + coalesce(a.edges_count, 0)) AS edges_count
ORDER BY created_at DESC

// name: pause_batch
// scope: space
// The article in progress is paused too; its task drops the result before writing it.
MATCH (a:Article {batch_id: $batch_id, space_id: $space_id})
WHERE a.status IN ['pending', 'processing']
SET a.status = 'paused'
RETURN a.queue_token AS token

// name: resume_batch
// scope: space
MATCH (a:Article {batch_id: $batch_id, space_id: $space_id})
WHERE a.status = 'paused'
SET a.status = 'pending', a.queued_at = datetime(), a.queue_token = randomUUID()
RETURN a.id AS id, a.title AS title, a.provider AS provider, a.queue_token AS token

// name: cancel_batch
// scope: space
MATCH (a:Article {batch_id: $batch_id, space_id: $space_id})
WHERE a.status IN ['pending', 'processing', 'paused']
SET a.status = 'cancelled', a.error = null
RETURN a.id AS id, a.title AS title, a.queue_token AS token
