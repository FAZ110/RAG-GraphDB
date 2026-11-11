// name: article_statuses
// scope: space
MATCH (a:Article {space_id: $space_id})
RETURN a.status AS status, count(*) AS count

// name: entity_labels
// scope: space
MATCH (e:Entity {space_id: $space_id})
RETURN e.label AS label, count(*) AS count
ORDER BY count DESC, label

// name: relationship_count
// scope: space
MATCH (:Entity {space_id: $space_id})-[r]->(:Entity)
RETURN count(r) AS count
