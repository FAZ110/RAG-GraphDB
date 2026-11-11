// name: create_user
// scope: system
CREATE (u:User {
  id: $id, email: $email, password_hash: $password_hash, role: $role,
  disabled: false, server_models: $server_models, created_at: datetime()
})
RETURN u

// name: user_by_id
// scope: system
MATCH (u:User {id: $id})
RETURN u

// name: user_by_email
// scope: system
MATCH (u:User {email: $email})
RETURN u

// name: touch_login
// scope: system
MATCH (u:User {id: $id})
SET u.last_login_at = datetime()

// name: set_password_hash
// scope: system
MATCH (u:User {id: $id})
SET u.password_hash = $password_hash

// name: list_users
// scope: admin
MATCH (u:User)
RETURN u,
       COUNT { MATCH (s:Space {owner_id: u.id}) } AS space_count,
       COUNT { MATCH (s:Space {owner_id: u.id}) MATCH (:Article {space_id: s.id}) } AS article_count
ORDER BY u.created_at

// name: update_user
// scope: admin
MATCH (u:User {id: $id})
SET u += $changes
RETURN u

// name: owned_space_ids
// scope: admin
MATCH (s:Space {owner_id: $id})
RETURN s.id AS id

// name: delete_user
// scope: admin
MATCH (u:User {id: $id})
OPTIONAL MATCH (p:LlmProvider {owner_id: $id})
WITH u, collect(p) AS providers
FOREACH (p IN providers | DELETE p)
DELETE u

// name: claim_orphans
// scope: system
OPTIONAL MATCH (s:Space) WHERE s.owner_id IS NULL
SET s.owner_id = $id
WITH count(s) AS spaces
OPTIONAL MATCH (p:LlmProvider) WHERE p.owner_id IS NULL
SET p.owner_id = $id
RETURN spaces, count(p) AS providers

// name: app_settings
// scope: system
MERGE (a:AppSettings {id: 'app'})
ON CREATE SET a.registration_open = true
RETURN a.registration_open AS registration_open

// name: set_app_settings
// scope: admin
MERGE (a:AppSettings {id: 'app'})
SET a.registration_open = $registration_open
RETURN a.registration_open AS registration_open
