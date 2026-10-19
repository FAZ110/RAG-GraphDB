// name: top_nodes
// Degree counts links to other entities only, not the MENTIONS from articles.
MATCH (n:Entity {space_id: $space_id})
WITH n, COUNT { (n)--(:Entity) } AS degree
ORDER BY degree DESC, n.id
LIMIT $limit
RETURN n.id AS id, n.label AS label, properties(n) AS props, degree

// name: edges_between
MATCH (a:Entity {space_id: $space_id})-[r]->(b:Entity)
WHERE a.id IN $ids AND b.id IN $ids
RETURN elementId(r) AS edge_id, a.id AS edge_source, b.id AS edge_target, type(r) AS edge_type

// name: count_nodes
MATCH (n:Entity {space_id: $space_id})
RETURN count(n) AS total

// name: node
MATCH (n:Entity {space_id: $space_id, id: $node_id})
RETURN n.id AS id, n.label AS label, properties(n) AS props, COUNT { (n)--(:Entity) } AS degree

// name: neighbours
MATCH (:Entity {space_id: $space_id, id: $node_id})-[r]-(m:Entity)
WITH m, r, COUNT { (m)--(:Entity) } AS degree
ORDER BY degree DESC, elementId(r)
LIMIT $limit
RETURN m.id AS id,
       m.label AS label,
       properties(m) AS props,
       degree,
       elementId(r) AS edge_id,
       type(r) AS edge_type,
       startNode(r).id AS edge_source,
       endNode(r).id AS edge_target

// name: search
// The vector index cannot filter by space, so it is asked for more neighbours than
// needed and those from other spaces are dropped.
CALL db.index.vector.queryNodes('entity_embeddings', $search_k, $vec)
YIELD node, score
WHERE node.space_id = $space_id
RETURN node.id AS id, node.name AS name, node.label AS label, score
ORDER BY score DESC
LIMIT $top_k
