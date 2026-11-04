export const PROVIDERS = [
  { value: 'local', label: 'Lokalny', model: 'LM Studio', paid: false },
  { value: 'groq', label: 'Groq', model: 'gpt-oss-120b', paid: false },
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o-mini', paid: true },
] as const

export type Provider = (typeof PROVIDERS)[number]['value'] | `custom:${string}`

export const customProvider = (id: string): Provider => `custom:${id}`

export const DEFAULT_PROVIDER: Provider = 'groq'
