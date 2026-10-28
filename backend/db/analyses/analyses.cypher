// name: list_analyses
MATCH (a:Analysis {space_id: $space_id})
RETURN a.id AS id,
       a.space_id AS space_id,
       a.name AS name,
       a.created_at AS created_at,
       a.updated_at AS updated_at,
       [(a)-[:INCLUDES]->(e:Entity) | e.label] AS labels
// Ones never placed by hand (new ones) come first, newest on top, then the arranged ones.
ORDER BY a.position IS NOT NULL, a.position, a.updated_at DESC

// name: list_all_analyses
MATCH (a:Analysis)
MATCH (s:Space {id: a.space_id})
RETURN a.id AS id,
       a.space_id AS space_id,
       s.name AS space_name,
       a.name AS name,
       a.created_at AS created_at,
       a.updated_at AS updated_at,
       [(a)-[:INCLUDES]->(e:Entity) | e.label] AS labels
ORDER BY a.position IS NOT NULL, a.position, a.updated_at DESC
LIMIT $limit

// name: analysis
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
RETURN a.id AS id,
       a.space_id AS space_id,
       a.name AS name,
       a.created_at AS created_at,
       a.updated_at AS updated_at,
       a.revision AS revision,
       a.viewport_x AS viewport_x,
       a.viewport_y AS viewport_y,
       a.viewport_zoom AS viewport_zoom,
       [(a)-[:INCLUDES]->(e:Entity) | e.label] AS labels,
       [(a)-[:CITES]->(ar:Article) | ar.id] AS article_ids

// name: analysis_entities
MATCH (:Analysis {space_id: $space_id, id: $analysis_id})-[i:INCLUDES]->(n:Entity)
RETURN n.id AS id,
       n.label AS label,
       properties(n) AS props,
       COUNT { (n)--(:Entity) } AS degree,
       i.x AS x,
       i.y AS y

// name: analysis_edges
// Traversed from the analysis, so a canvas of hundreds needs no list lookups.
MATCH (an:Analysis {space_id: $space_id, id: $analysis_id})-[:INCLUDES]->(a:Entity)-[r]->(b:Entity)
WHERE (an)-[:INCLUDES]->(b)
RETURN elementId(r) AS edge_id, a.id AS edge_source, b.id AS edge_target, type(r) AS edge_type

// name: create_analysis
CREATE (:Analysis {
  id: $analysis_id,
  space_id: $space_id,
  name: $name,
  created_at: datetime(),
  updated_at: datetime(),
  revision: 0
})

// name: update_analysis
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
SET a += $changes, a.updated_at = datetime()
RETURN a.id AS id

// name: claim_revision
// Only the tab that saw the latest revision may save; another gets `current` false.
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
WITH a, a.revision = $revision AS current
SET a.revision = CASE WHEN current THEN a.revision + 1 ELSE a.revision END,
    a.updated_at = CASE WHEN current THEN datetime() ELSE a.updated_at END
RETURN current, a.revision AS revision, a.updated_at AS updated_at

// name: remove_entities
MATCH (:Analysis {space_id: $space_id, id: $analysis_id})-[i:INCLUDES]->(n:Entity)
WHERE n.id IN $ids
DELETE i

// name: uncite_articles
MATCH (:Analysis {space_id: $space_id, id: $analysis_id})-[c:CITES]->(ar:Article)
WHERE ar.id IN $ids
DELETE c

// name: place_entities
// Adds or moves; entities deleted since the canvas was loaded are skipped.
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
UNWIND $entities AS placed
MATCH (n:Entity {space_id: $space_id, id: placed.id})
MERGE (a)-[i:INCLUDES]->(n)
SET i.x = placed.x, i.y = placed.y

// name: cite_articles
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
UNWIND $article_ids AS article_id
MATCH (ar:Article {space_id: $space_id, id: article_id})
MERGE (a)-[:CITES]->(ar)

// name: reorder_analyses
UNWIND range(0, size($analysis_ids) - 1) AS position
MATCH (a:Analysis {id: $analysis_ids[position]})
SET a.position = position

// name: delete_analysis
MATCH (a:Analysis {space_id: $space_id, id: $analysis_id})
DETACH DELETE a
RETURN count(*) AS deleted
