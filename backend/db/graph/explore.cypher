// name: relation_groups
// scope: space
// A node's neighbours counted per direction, relationship type and entity type.
MATCH (n:Entity {space_id: $space_id, id: $node_id})-[r]-(m:Entity)
RETURN CASE WHEN startNode(r) = n THEN 'out' ELSE 'in' END AS direction,
       type(r) AS type,
       m.label AS label,
       count(DISTINCT m) AS count
ORDER BY count DESC, type, label

// name: common_neighbours
// scope: space
// Entities linked to at least $min_shared of the given ones, those sharing most first.
MATCH (a:Entity {space_id: $space_id})-[r]-(m:Entity)
WHERE a.id IN $ids AND NOT m.id IN $ids AND ($label IS NULL OR m.label = $label)
WITH m, collect(DISTINCT a.id) AS shared, collect(r) AS rels
WHERE size(shared) >= $min_shared
WITH m, shared, rels, COUNT { (m)--(:Entity) } AS degree
ORDER BY size(shared) DESC, degree DESC, m.name
WITH collect({m: m, shared: shared, rels: rels, degree: degree}) AS hits
UNWIND hits[..$limit] AS hit
WITH hit, size(hits) AS total, hit.m AS m
RETURN m.id AS id,
       m.label AS label,
       properties(m) AS props,
       hit.degree AS degree,
       hit.shared AS shared,
       [r IN hit.rels | {
         edge_id: elementId(r),
         edge_source: startNode(r).id,
         edge_target: endNode(r).id,
         edge_type: type(r)
       }] AS edges,
       total

// name: shortest_paths
// scope: space
// Only through entities, never through the articles mentioning them. The path count is a
// validated integer put into the query, as Cypher takes no parameter there.
MATCH (s:Entity {space_id: $space_id, id: $source_id})
MATCH (t:Entity {space_id: $space_id, id: $target_id})
// Inside the parentheses the check runs before the shortest are picked: no entity twice, as two
// relations between one pair would otherwise let a path go there and back.
MATCH p = SHORTEST {k} (
  (s) ((:Entity)-[]-(step:Entity)){1,} (t)
  WHERE all(i IN range(0, size(step) - 1) WHERE step[i] <> s AND NOT step[i] IN step[i + 1..])
)
RETURN [n IN nodes(p) | n.id] AS node_ids,
       [r IN relationships(p) | {
         edge_id: elementId(r),
         edge_source: startNode(r).id,
         edge_target: endNode(r).id,
         edge_type: type(r)
       }] AS edges

// name: entities_by_label
// scope: space
MATCH (n:Entity {space_id: $space_id, label: $label})
WITH n, COUNT { (n)--(:Entity) } AS degree
ORDER BY degree DESC, n.name
WITH collect({n: n, degree: degree}) AS ranked
UNWIND ranked[$offset..$offset + $limit] AS hit
RETURN hit.n.id AS id,
       hit.n.label AS label,
       properties(hit.n) AS props,
       hit.degree AS degree,
       size(ranked) AS total

// name: sources_for
// scope: space
// Articles mentioning any of the entities, those mentioning most of them first.
MATCH (ar:Article)-[:MENTIONS]->(n:Entity {space_id: $space_id})
WHERE n.id IN $ids
WITH ar, collect(DISTINCT n.id) AS entity_ids
ORDER BY size(entity_ids) DESC, ar.created_at DESC
LIMIT $limit
RETURN ar.id AS id,
       ar.title AS title,
       ar.url AS url,
       ar.created_at AS created_at,
       entity_ids

// name: co_mentions
// scope: space
// Entities written about in the same articles as the node yet not related to it in the graph,
// those sharing most articles first.
MATCH (n:Entity {space_id: $space_id, id: $node_id})<-[:MENTIONS]-(ar:Article)-[:MENTIONS]->(m:Entity)
WHERE m <> n AND NOT (n)--(m)
WITH m, count(DISTINCT ar) AS articles
ORDER BY articles DESC, m.name
LIMIT $limit
RETURN m.id AS id,
       m.label AS label,
       properties(m) AS props,
       COUNT { (m)--(:Entity) } AS degree,
       articles
