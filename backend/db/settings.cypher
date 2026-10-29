// name: list_custom_providers
MATCH (p:LlmProvider)
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint
ORDER BY p.created_at

// name: create_custom_provider
CREATE (p:LlmProvider {
  id: $id, name: $name, base_url: $base_url, model: $model,
  api_key_encrypted: $api_key_encrypted, api_key_hint: $api_key_hint, created_at: datetime()
})
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint

// name: update_custom_provider
MATCH (p:LlmProvider {id: $id})
SET p.name = $name, p.base_url = $base_url, p.model = $model
FOREACH (_ IN CASE WHEN $replace_key THEN [1] ELSE [] END |
  SET p.api_key_encrypted = $api_key_encrypted, p.api_key_hint = $api_key_hint
)
RETURN p.id AS id, p.name AS name, p.base_url AS base_url, p.model AS model,
       p.api_key_encrypted IS NOT NULL AS has_api_key, p.api_key_hint AS api_key_hint

// name: delete_custom_provider
MATCH (p:LlmProvider {id: $id})
DELETE p
RETURN count(*) AS deleted

// name: get_custom_provider_config
MATCH (p:LlmProvider {id: $id})
RETURN p.base_url AS base_url, p.model AS model, p.api_key_encrypted AS api_key_encrypted
