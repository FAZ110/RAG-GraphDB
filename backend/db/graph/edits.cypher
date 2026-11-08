// name: entity
MATCH (n:Entity {space_id: $space_id, id: $node_id})
RETURN n.id AS id, n.label AS label, properties(n) AS props, COUNT { (n)--(:Entity) } AS degree

// name: create_entity
// Manual entities are kept when no article mentions them (see release_article_mentions).
CREATE (n:Entity {
  id: randomUUID(),
  space_id: $space_id,
  label: $label,
  name: $name,
  aliases: $aliases,
  created_at: datetime(),
  embedding: $embedding,
  manual: true
})
SET n:$($label), n.description = $description, n.type = $type
RETURN n.id AS id, n.label AS label, properties(n) AS props, 0 AS degree

// name: update_entity
MATCH (n:Entity {space_id: $space_id, id: $node_id})
REMOVE n:$($old_label)
SET n:$($label),
    n.label = $label,
    n.name = $name,
    n.description = $description,
    n.type = $type,
    n.aliases = $aliases,
    n.embedding = $embedding,
    n.manual = true
RETURN n.id AS id, n.label AS label, properties(n) AS props, COUNT { (n)--(:Entity) } AS degree

// name: delete_entity
MATCH (n:Entity {space_id: $space_id, id: $node_id})
DETACH DELETE n
RETURN count(*) AS deleted

// name: merge_mentions
MATCH (keep:Entity {space_id: $space_id, id: $keep_id})
MATCH (a:Article)-[m:MENTIONS]->(:Entity {space_id: $space_id, id: $dup_id})
MERGE (a)-[k:MENTIONS]->(keep)
SET k.spans = coalesce(k.spans, []) + [s IN coalesce(m.spans, []) WHERE NOT s IN coalesce(k.spans, [])]

// name: merge_outgoing
// Links between the two entities would become self-loops, so they are dropped.
MATCH (keep:Entity {space_id: $space_id, id: $keep_id})
MATCH (dup:Entity {space_id: $space_id, id: $dup_id})-[r]->(x:Entity)
WHERE x <> keep AND x <> dup
MERGE (keep)-[k:$(type(r))]->(x)
SET k.article_ids = coalesce(k.article_ids, []) + [i IN coalesce(r.article_ids, []) WHERE NOT i IN coalesce(k.article_ids, [])],
    k.evidence = coalesce(k.evidence, []) + [s IN coalesce(r.evidence, []) WHERE NOT s IN coalesce(k.evidence, [])],
    k.manual = coalesce(k.manual, false) OR coalesce(r.manual, false)

// name: merge_incoming
MATCH (keep:Entity {space_id: $space_id, id: $keep_id})
MATCH (x:Entity)-[r]->(dup:Entity {space_id: $space_id, id: $dup_id})
WHERE x <> keep AND x <> dup
MERGE (x)-[k:$(type(r))]->(keep)
SET k.article_ids = coalesce(k.article_ids, []) + [i IN coalesce(r.article_ids, []) WHERE NOT i IN coalesce(k.article_ids, [])],
    k.evidence = coalesce(k.evidence, []) + [s IN coalesce(r.evidence, []) WHERE NOT s IN coalesce(k.evidence, [])],
    k.manual = coalesce(k.manual, false) OR coalesce(r.manual, false)

// name: merge_analyses
// An analysis showing `dup` shows `keep` instead, where `dup` stood unless it already shows
// `keep`. Its revision moves on, so a tab still holding `dup` reloads before saving over this.
MATCH (a:Analysis {space_id: $space_id})-[i:INCLUDES]->(:Entity {space_id: $space_id, id: $dup_id})
MATCH (keep:Entity {space_id: $space_id, id: $keep_id})
MERGE (a)-[k:INCLUDES]->(keep)
ON CREATE SET k.x = i.x, k.y = i.y
SET a.revision = a.revision + 1

// name: merge_finish
// Marked manual, so a re-extraction that no longer mentions it does not delete the result.
MATCH (keep:Entity {space_id: $space_id, id: $keep_id})
MATCH (dup:Entity {space_id: $space_id, id: $dup_id})
SET keep += $props, keep.aliases = $aliases, keep.manual = true
DETACH DELETE dup

// name: create_relationship
MATCH (a:Entity {space_id: $space_id, id: $source_id})
MATCH (b:Entity {space_id: $space_id, id: $target_id})
MERGE (a)-[r:$($type)]->(b)
SET r.article_ids = coalesce(r.article_ids, []), r.evidence = coalesce(r.evidence, []), r.manual = true
RETURN elementId(r) AS edge_id, a.id AS edge_source, b.id AS edge_target, type(r) AS edge_type

// name: update_relationship
// A relationship's type cannot change, so it is replaced, keeping its sources.
MATCH (a:Entity {space_id: $space_id})-[r]->(b:Entity)
WHERE elementId(r) = $edge_id
MERGE (a)-[k:$($type)]->(b)
SET k.article_ids = coalesce(k.article_ids, []) + [i IN coalesce(r.article_ids, []) WHERE NOT i IN coalesce(k.article_ids, [])],
    k.evidence = coalesce(k.evidence, []) + [s IN coalesce(r.evidence, []) WHERE NOT s IN coalesce(k.evidence, [])],
    k.manual = true
FOREACH (_ IN CASE WHEN r <> k THEN [1] ELSE [] END | DELETE r)
RETURN elementId(k) AS edge_id, a.id AS edge_source, b.id AS edge_target, type(k) AS edge_type

// name: delete_relationship
MATCH (:Entity {space_id: $space_id})-[r]->(:Entity)
WHERE elementId(r) = $edge_id
DELETE r
RETURN count(*) AS deleted

// name: reject_suggestion
MATCH (s:DuplicateSuggestion {space_id: $space_id, id: $suggestion_id})
SET s.rejected = true
RETURN count(*) AS rejected
