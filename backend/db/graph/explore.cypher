// name: relation_groups
// A node's neighbours counted per direction, relationship type and entity type.
MATCH (n:Entity {space_id: $space_id, id: $node_id})-[r]-(m:Entity)
RETURN CASE WHEN startNode(r) = n THEN 'out' ELSE 'in' END AS direction,
       type(r) AS type,
       m.label AS label,
       count(DISTINCT m) AS count
ORDER BY count DESC, type, label

// name: common_neighbours
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
// Only through entities, never through the articles mentioning them. The path count and
// length bounds are validated integers put into the query, as Cypher takes no parameters there.
MATCH (s:Entity {space_id: $space_id, id: $source_id})
MATCH (t:Entity {space_id: $space_id, id: $target_id})
MATCH p = SHORTEST {k} (s) ((:Entity)-[]-(:Entity)){1,{max_length}} (t)
RETURN [n IN nodes(p) | n.id] AS node_ids,
       [r IN relationships(p) | {
         edge_id: elementId(r),
         edge_source: startNode(r).id,
         edge_target: endNode(r).id,
         edge_type: type(r)
       }] AS edges

// name: entities_by_label
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
