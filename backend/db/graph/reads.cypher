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

// name: nodes_by_id
MATCH (n:Entity {space_id: $space_id})
WHERE n.id IN $ids
RETURN n.id AS id, n.label AS label, properties(n) AS props, COUNT { (n)--(:Entity) } AS degree

// name: count_nodes
MATCH (n:Entity {space_id: $space_id})
RETURN count(n) AS total

// name: node
MATCH (n:Entity {space_id: $space_id, id: $node_id})
RETURN n.id AS id, n.label AS label, properties(n) AS props, COUNT { (n)--(:Entity) } AS degree

// name: neighbours
// Optionally only one group of them: one relationship type, direction or entity type.
MATCH (n:Entity {space_id: $space_id, id: $node_id})-[r]-(m:Entity)
WHERE ($type IS NULL OR type(r) = $type)
  AND ($label IS NULL OR m.label = $label)
  AND ($direction IS NULL OR ($direction = 'out') = (startNode(r) = n))
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

// name: search_all
// Across every space, so no hits are dropped and the index is asked for exactly top_k.
CALL db.index.vector.queryNodes('entity_embeddings', $top_k, $vec)
YIELD node, score
MATCH (s:Space {id: node.space_id})
RETURN node.id AS id,
       node.name AS name,
       node.label AS label,
       node.space_id AS space_id,
       s.name AS space_name,
       score
ORDER BY score DESC

// name: node_sources
MATCH (a:Article)-[m:MENTIONS]->(:Entity {space_id: $space_id, id: $node_id})
WITH a, [s IN coalesce(m.spans, []) | [x IN split(s, ':') | toInteger(x)]] AS spans
RETURN a.id AS article_id,
       a.title AS title,
       a.content AS content,
       spans
ORDER BY a.created_at DESC

// name: edge_sources
MATCH (s:Entity {space_id: $space_id})-[r]->(:Entity)
WHERE elementId(r) = $edge_id
UNWIND r.article_ids AS article_id
MATCH (a:Article {id: article_id})
WITH a, [ev IN coalesce(r.evidence, []) WHERE ev STARTS WITH a.id + ':' |
         [x IN split(substring(ev, size(a.id) + 1), ':') | toInteger(x)]] AS spans
RETURN a.id AS article_id,
       a.title AS title,
       a.content AS content,
       spans
ORDER BY a.created_at DESC

// name: nearest_entities
// Nearest entities of the space to a vector; names are compared in Python.
CALL db.index.vector.queryNodes('entity_embeddings', $search_k, $vec)
YIELD node, score
WHERE node.space_id = $space_id
RETURN node.id AS id,
       node.name AS name,
       node.label AS label,
       coalesce(node.aliases, []) AS aliases,
       score
ORDER BY score DESC
LIMIT $search_top

// name: duplicate_suggestions
// A pair whose entity was since merged, renamed or deleted no longer matches and is skipped.
// The thresholds apply again here, so suggestions saved under looser ones drop out.
MATCH (s:DuplicateSuggestion {space_id: $space_id, rejected: false})
WHERE s.score >= $score_min AND (s.lexical >= $lexical_min OR s.score >= $any_name_min)
MATCH (a:Entity {space_id: $space_id, label: s.a_label, name: s.a_name})
MATCH (b:Entity {space_id: $space_id, label: s.b_label, name: s.b_name})
RETURN s.id AS id,
       s.score AS score,
       s.lexical AS lexical,
       a.id AS a_id, a.label AS a_label, properties(a) AS a_props, COUNT { (a)--(:Entity) } AS a_degree,
       b.id AS b_id, b.label AS b_label, properties(b) AS b_props, COUNT { (b)--(:Entity) } AS b_degree
ORDER BY s.score DESC

// name: overview_nodes
MATCH (n:Entity {space_id: $space_id})
WITH n, COUNT { (n)--(:Entity) } AS degree
ORDER BY degree DESC, n.id
LIMIT $limit
RETURN n.id AS id, coalesce(n.name, '') AS name, n.label AS label, degree

// name: space_edges
MATCH (a:Entity {space_id: $space_id})-[r]->(b:Entity)
RETURN elementId(r) AS edge_id, a.id AS edge_source, b.id AS edge_target, type(r) AS edge_type
