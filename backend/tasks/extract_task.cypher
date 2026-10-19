// name: similar_in_space
CALL db.index.vector.queryNodes('entity_embeddings', $search_k, $vec)
YIELD node, score
WHERE node.space_id = $space_id
RETURN node.name AS name,
       [l IN labels(node) WHERE l <> 'Entity'][0] AS label,
       score
ORDER BY score DESC
LIMIT $top_k
