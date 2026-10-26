// name: list_spaces
MATCH (s:Space)
RETURN s.id AS id,
       s.name AS name,
       s.created_at AS created_at,
       COUNT { MATCH (a:Article {space_id: s.id}) } AS article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count
// Spaces never placed by hand (new ones) come first, newest on top, then the arranged ones.
ORDER BY s.position IS NOT NULL, s.position, s.created_at DESC

// name: get_space
MATCH (s:Space {id: $space_id})
RETURN s.id AS id,
       s.name AS name,
       s.created_at AS created_at,
       COUNT { MATCH (a:Article {space_id: s.id}) } AS article_count,
       COUNT { MATCH (e:Entity {space_id: s.id}) } AS entity_count

// name: create_space
CREATE (:Space {id: $space_id, name: $name, created_at: datetime()})

// name: rename_space
MATCH (s:Space {id: $space_id})
SET s.name = $name
RETURN s.id AS id

// name: reorder_spaces
UNWIND range(0, size($space_ids) - 1) AS position
MATCH (s:Space {id: $space_ids[position]})
SET s.position = position

// name: delete_space_articles
MATCH (n:Article {space_id: $space_id})
CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space_entities
MATCH (n:Entity {space_id: $space_id})
CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space_suggestions
MATCH (n:DuplicateSuggestion {space_id: $space_id})
CALL (n) { DELETE n } IN TRANSACTIONS OF 1000 ROWS

// name: delete_space
MATCH (s:Space {id: $space_id})
DELETE s
