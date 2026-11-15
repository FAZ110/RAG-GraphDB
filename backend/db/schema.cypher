// name: space_id
// scope: system
CREATE CONSTRAINT space_id IF NOT EXISTS FOR (s:Space) REQUIRE s.id IS UNIQUE

// name: space_name
// scope: system
// Names were unique across the app before accounts; now each owner has their own.
DROP CONSTRAINT space_name IF EXISTS

// name: space_owner_name
// scope: system
CREATE CONSTRAINT space_owner_name IF NOT EXISTS
FOR (s:Space) REQUIRE (s.owner_id, s.name) IS UNIQUE

// name: space_owner
// scope: system
CREATE INDEX space_owner IF NOT EXISTS FOR (s:Space) ON (s.owner_id)

// name: user_id
// scope: system
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE

// name: user_email
// scope: system
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE

// name: provider_owner
// scope: system
CREATE INDEX provider_owner IF NOT EXISTS FOR (p:LlmProvider) ON (p.owner_id)

// name: article_id
// scope: system
CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE

// name: article_source
// scope: system
CREATE CONSTRAINT article_source IF NOT EXISTS
FOR (a:Article) REQUIRE (a.space_id, a.source_key) IS UNIQUE

// name: article_space
// scope: system
CREATE INDEX article_space IF NOT EXISTS FOR (a:Article) ON (a.space_id)

// name: article_status
// scope: system
CREATE INDEX article_status IF NOT EXISTS FOR (a:Article) ON (a.status)

// name: article_batch
// scope: system
CREATE INDEX article_batch IF NOT EXISTS FOR (a:Article) ON (a.batch_id)

// name: entity_id
// scope: system
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE

// name: entity_key
// scope: system
CREATE CONSTRAINT entity_key IF NOT EXISTS
FOR (e:Entity) REQUIRE (e.space_id, e.label, e.name) IS UNIQUE

// name: entity_space
// scope: system
CREATE INDEX entity_space IF NOT EXISTS FOR (e:Entity) ON (e.space_id)

// name: entity_embeddings
// scope: system
CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
FOR (n:Entity) ON (n.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: $dim, `vector.similarity_function`: 'cosine'}}

// name: duplicate_suggestion_id
// scope: system
CREATE CONSTRAINT duplicate_suggestion_id IF NOT EXISTS
FOR (s:DuplicateSuggestion) REQUIRE s.id IS UNIQUE

// name: duplicate_suggestion_space
// scope: system
CREATE INDEX duplicate_suggestion_space IF NOT EXISTS
FOR (s:DuplicateSuggestion) ON (s.space_id)

// name: analysis_id
// scope: system
CREATE CONSTRAINT analysis_id IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE

// name: analysis_space
// scope: system
CREATE INDEX analysis_space IF NOT EXISTS FOR (a:Analysis) ON (a.space_id)

// name: provider_id
// scope: system
CREATE CONSTRAINT provider_id IF NOT EXISTS FOR (p:LlmProvider) REQUIRE p.id IS UNIQUE

// name: app_settings_id
// scope: system
// The settings are one node MERGEd on this id; unique, so two first requests cannot make two.
CREATE CONSTRAINT app_settings_id IF NOT EXISTS FOR (a:AppSettings) REQUIRE a.id IS UNIQUE

// name: duplicate_suggestion_key
// scope: system
// The key extraction MERGEs suggestions on: a lookup instead of a scan of the space's suggestions.
CREATE CONSTRAINT duplicate_suggestion_key IF NOT EXISTS
FOR (s:DuplicateSuggestion) REQUIRE (s.space_id, s.a_label, s.a_name, s.b_label, s.b_name) IS UNIQUE

// name: entity_space_label
// scope: system
// One type's entities in a space, without reading every entity of the space.
CREATE INDEX entity_space_label IF NOT EXISTS FOR (e:Entity) ON (e.space_id, e.label)

// name: article_space_status
// scope: system
// Stalled, failed and retried articles of a space, checked on most article requests.
CREATE INDEX article_space_status IF NOT EXISTS FOR (a:Article) ON (a.space_id, a.status)
