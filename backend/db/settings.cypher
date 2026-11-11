// name: list_custom_providers
MATCH (p:LlmProvider {owner_id: $owner_id})
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint,
       coalesce(p.max_parallel, 1) AS max_parallel
ORDER BY p.created_at

// name: create_custom_provider
CREATE (p:LlmProvider {
  id: $id, owner_id: $owner_id, name: $name, base_url: $base_url, model: $model,
  api_key_encrypted: $api_key_encrypted, api_key_hint: $api_key_hint, max_parallel: $max_parallel,
  created_at: datetime()
})
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint,
       coalesce(p.max_parallel, 1) AS max_parallel

// name: update_custom_provider
MATCH (p:LlmProvider {id: $id, owner_id: $owner_id})
SET p.name = $name, p.base_url = $base_url, p.model = $model, p.max_parallel = $max_parallel
FOREACH (_ IN CASE WHEN $replace_key THEN [1] ELSE [] END |
  SET p.api_key_encrypted = $api_key_encrypted, p.api_key_hint = $api_key_hint
)
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint,
       coalesce(p.max_parallel, 1) AS max_parallel

// name: delete_custom_provider
MATCH (p:LlmProvider {id: $id, owner_id: $owner_id})
DELETE p
RETURN count(*) AS deleted

// name: get_custom_provider_config
MATCH (p:LlmProvider {id: $id, owner_id: $owner_id})
RETURN p.base_url AS base_url, p.model AS model, p.api_key_encrypted AS api_key_encrypted

// name: get_custom_provider_limit
MATCH (p:LlmProvider {id: $id})
RETURN coalesce(p.max_parallel, 1) AS max_parallel
