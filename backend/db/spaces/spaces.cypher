// name: list_spaces
// scope: owner
MATCH (s:Space {owner_id: $owner_id})
RETURN s.id AS id,
       s.name AS name,
       s.created_at AS created_at,
       COUNT { MATCH (a:Article {space_id: s.id}) } AS article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count
// Spaces never placed by hand (new ones) come first, newest on top, then the arranged ones.
ORDER BY s.position IS NOT NULL, s.position, s.created_at DESC

// name: get_space
// scope: space
MATCH (s:Space {id: $space_id})
RETURN s.id AS id,
       s.owner_id AS owner_id,
       s.name AS name,
       s.created_at AS created_at,
       COUNT { MATCH (a:Article {space_id: s.id}) } AS article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count

// name: create_space
// scope: owner
CREATE (s:Space {id: $space_id, owner_id: $owner_id, name: $name, created_at: datetime()})
RETURN s.id AS id, s.owner_id AS owner_id, s.name AS name, s.created_at AS created_at,
       0 AS article_count, 0 AS entity_count

// name: owned_space
// scope: owner
// The check every request to a space passes before it gets that space's scope.
MATCH (s:Space {id: $requested_id, owner_id: $owner_id})
RETURN s.id AS id, s.owner_id AS owner_id

// name: rename_space
// scope: space
MATCH (s:Space {id: $space_id})
SET s.name = $name
RETURN s.id AS id

// name: reorder_spaces
// scope: owner
UNWIND range(0, size($space_ids) - 1) AS position
MATCH (s:Space {id: $space_ids[position], owner_id: $owner_id})
SET s.position = position

// name: delete_space_articles
// scope: space
MATCH (n:Article {space_id: $space_id})
CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space_entities
// scope: space
MATCH (n:Entity {space_id: $space_id})
CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space_suggestions
// scope: space
MATCH (n:DuplicateSuggestion {space_id: $space_id})
CALL (n) { DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space_analyses
// scope: space
MATCH (n:Analysis {space_id: $space_id})
CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space
// scope: space
MATCH (s:Space {id: $space_id})
DELETE s

// name: get_extraction_settings
// scope: space
MATCH (s:Space {id: $space_id})
RETURN s.extraction_rules AS rules, s.extraction_labels AS labels

// name: set_extraction_settings
// scope: space
MATCH (s:Space {id: $space_id})
SET s.extraction_rules = $rules, s.extraction_labels = $labels
RETURN s.extraction_rules AS rules, s.extraction_labels AS labels
