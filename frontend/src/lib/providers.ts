export const PROVIDERS = [
  { value: 'local', label: 'Lokalny', model: 'LM Studio', paid: false },
  { value: 'groq', label: 'Groq', model: 'llama-3.3-70b', paid: false },
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini', paid: true },
] as const

export const CUSTOM_PROVIDER = 'custom'

export type Provider = (typeof PROVIDERS)[number]['value'] | typeof CUSTOM_PROVIDER

export const DEFAULT_PROVIDER: Provider = 'groq'
