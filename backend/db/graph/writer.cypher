// name: merge_entity
MERGE (n:Entity {space_id: $space_id, label: $label, name: $name})
ON CREATE SET n.id = randomUUID(), n.created_at = datetime(), n.embedding = $embedding
// Keep the first description and type: the stored embedding was made from them.
SET n:$($label),
    n += $props,
    n.description = coalesce(n.description, $description),
    n.type = coalesce(n.type, $type),
    n.aliases = coalesce(n.aliases, []) + [a IN $aliases WHERE NOT a IN coalesce(n.aliases, [])]
WITH n
MATCH (article:Article {id: $article_id})
MERGE (article)-[m:MENTIONS]->(n)
SET m.spans = coalesce(m.spans, []) + [s IN $spans WHERE NOT s IN coalesce(m.spans, [])]

// name: merge_relationship
MATCH (a:Entity {space_id: $space_id, label: $source_label, name: $source_name})
MATCH (b:Entity {space_id: $space_id, label: $target_label, name: $target_name})
MERGE (a)-[r:$($type)]->(b)
SET r.article_ids = coalesce(r.article_ids, []) + [i IN [$article_id] WHERE NOT i IN coalesce(r.article_ids, [])],
    // "article_id:start:end", since a relationship property cannot hold a map per article.
    r.evidence = coalesce(r.evidence, []) + [s IN $spans WHERE NOT s IN coalesce(r.evidence, [])]
