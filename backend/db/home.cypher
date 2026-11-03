// name: visit
// A visit starts after a gap of `$gap_minutes`; reloads and refetches within one keep the
// previous visit as the point the start page counts from.
MATCH (u:User {id: $owner_id})
SET u.previous_visit_at = CASE
      WHEN u.last_visit_at IS NULL OR u.last_visit_at < datetime() - duration({minutes: $gap_minutes})
      THEN u.last_visit_at
      ELSE u.previous_visit_at
    END,
    u.last_visit_at = datetime()
RETURN u.previous_visit_at AS since

// name: totals
// `$since` is null on a first visit; the counts after it are then 0.
MATCH (s:Space {owner_id: $owner_id})
WITH collect(s.id) AS space_ids
RETURN size(space_ids) AS spaces,
       COUNT { MATCH (a:Article) WHERE a.space_id IN space_ids } AS articles,
       COUNT { MATCH (e:Entity) WHERE e.space_id IN space_ids } AS entities,
       COUNT { MATCH (n:Analysis) WHERE n.space_id IN space_ids } AS analyses,
       COUNT { MATCH (a:Article) WHERE a.space_id IN space_ids AND a.created_at >= $week }
         AS week_articles,
       COUNT { MATCH (e:Entity) WHERE e.space_id IN space_ids AND e.created_at >= $week }
         AS week_entities,
       COUNT { MATCH (n:Analysis) WHERE n.space_id IN space_ids AND n.updated_at >= $week }
         AS week_analyses,
       COUNT { MATCH (a:Article) WHERE a.space_id IN space_ids AND a.created_at >= $since }
         AS new_articles,
       COUNT { MATCH (e:Entity) WHERE e.space_id IN space_ids AND e.created_at >= $since }
         AS new_entities

// name: recent_spaces
// A space is used when articles are added to it or one of its analyses is edited.
MATCH (s:Space {owner_id: $owner_id})
CALL (s) {
  OPTIONAL MATCH (a:Article {space_id: s.id})
  RETURN max(a.created_at) AS uploaded, count(a) AS article_count
}
CALL (s) {
  OPTIONAL MATCH (n:Analysis {space_id: s.id})
  RETURN max(n.updated_at) AS edited
}
WITH s, article_count,
     reduce(m = s.created_at, t IN [uploaded, edited] | CASE WHEN t > m THEN t ELSE m END)
       AS last_used
RETURN s.id AS id,
       s.name AS name,
       article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count,
       last_used
ORDER BY last_used DESC
LIMIT $limit

// name: recent_articles
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {space_id: s.id})
RETURN a.id AS id,
       a.space_id AS space_id,
       s.name AS space_name,
       a.title AS title,
       a.url AS url,
       a.status AS status,
       a.nodes_count AS nodes_count,
       a.created_at AS created_at
ORDER BY a.created_at DESC
LIMIT $limit

// name: failed_articles
MATCH (s:Space {owner_id: $owner_id})
MATCH (a:Article {space_id: s.id, status: 'error'})
RETURN s.id AS space_id, s.name AS space_name, collect(a.id) AS article_ids
ORDER BY space_name

// name: activity
MATCH (s:Space {owner_id: $owner_id})
WITH collect(s.id) AS space_ids
CALL (space_ids) {
  MATCH (a:Article) WHERE a.space_id IN space_ids AND a.created_at >= $start
  RETURN date(a.created_at) AS day, 'articles' AS kind
  UNION ALL
  MATCH (n:Analysis) WHERE n.space_id IN space_ids AND n.updated_at >= $start
  RETURN date(n.updated_at) AS day, 'analyses' AS kind
  UNION ALL
  MATCH (e:Entity) WHERE e.space_id IN space_ids AND e.created_at >= $start
  RETURN date(e.created_at) AS day, 'entities' AS kind
}
RETURN day, kind, count(*) AS count
ORDER BY day
