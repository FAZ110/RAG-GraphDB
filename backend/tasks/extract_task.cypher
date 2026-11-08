// name: similar_in_space
CALL db.index.vector.queryNodes('entity_embeddings', $search_k, $vec)
YIELD node, score
WHERE node.space_id = $space_id
RETURN node.name AS name,
       node.description AS description,
       node.type AS type,
       node.aliases AS aliases,
       [l IN labels(node) WHERE l <> 'Entity'][0] AS label,
       score
ORDER BY score DESC
LIMIT $top_k

// name: suggest_duplicate
// Keyed by both entities' (label, name), which outlive the ids a re-extraction replaces,
// so a pair the user rejected stays rejected.
MERGE (s:DuplicateSuggestion {
  space_id: $space_id, a_label: $a_label, a_name: $a_name, b_label: $b_label, b_name: $b_name
})
ON CREATE SET s.id = randomUUID(), s.created_at = datetime(), s.rejected = false
SET s.score = $score, s.lexical = $lexical
