// name: space_id
CREATE CONSTRAINT space_id IF NOT EXISTS FOR (s:Space) REQUIRE s.id IS UNIQUE

// name: space_name
CREATE CONSTRAINT space_name IF NOT EXISTS FOR (s:Space) REQUIRE s.name IS UNIQUE

// name: article_id
CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE

// name: article_source
CREATE CONSTRAINT article_source IF NOT EXISTS
FOR (a:Article) REQUIRE (a.space_id, a.source_key) IS UNIQUE

// name: article_space
CREATE INDEX article_space IF NOT EXISTS FOR (a:Article) ON (a.space_id)

// name: article_status
CREATE INDEX article_status IF NOT EXISTS FOR (a:Article) ON (a.status)

// name: article_batch
CREATE INDEX article_batch IF NOT EXISTS FOR (a:Article) ON (a.batch_id)

// name: entity_id
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE

// name: entity_key
CREATE CONSTRAINT entity_key IF NOT EXISTS
FOR (e:Entity) REQUIRE (e.space_id, e.label, e.name) IS UNIQUE

// name: entity_space
CREATE INDEX entity_space IF NOT EXISTS FOR (e:Entity) ON (e.space_id)

// name: entity_embeddings
CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
FOR (n:Entity) ON (n.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: $dim, `vector.similarity_function`: 'cosine'}}

// name: duplicate_suggestion_id
CREATE CONSTRAINT duplicate_suggestion_id IF NOT EXISTS
FOR (s:DuplicateSuggestion) REQUIRE s.id IS UNIQUE

// name: duplicate_suggestion_space
CREATE INDEX duplicate_suggestion_space IF NOT EXISTS
FOR (s:DuplicateSuggestion) ON (s.space_id)

// name: analysis_id
CREATE CONSTRAINT analysis_id IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE

// name: analysis_space
CREATE INDEX analysis_space IF NOT EXISTS FOR (a:Analysis) ON (a.space_id)
