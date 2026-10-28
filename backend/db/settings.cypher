// name: get_custom_provider
MATCH (p:LlmProvider {id: 'custom'})
RETURN p.name AS name, p.base_url AS base_url, p.model AS model, p.api_key AS api_key

// name: set_custom_provider
MERGE (p:LlmProvider {id: 'custom'})
SET p.name = $name, p.base_url = $base_url, p.model = $model,
    p.api_key = coalesce($api_key, p.api_key)
RETURN p.name AS name, p.base_url AS base_url, p.model AS model, p.api_key AS api_key

// name: delete_custom_provider
MATCH (p:LlmProvider {id: 'custom'})
DELETE p
