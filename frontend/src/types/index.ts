export interface ArticleRequest {
  url?: string
  title?: string
  content: string
}

export interface BulkExtractRequest {
  articles: ArticleRequest[]
  provider: string
}

export interface NodeResult {
  id: string
  label: string
  properties: Record<string, unknown>
}

export interface EdgeResult {
  source: string
  target: string
  type: string
  properties: Record<string, unknown>
}

export interface JobSubmitResponse {
  job_id: string
}

export interface SimilarNode {
  id: string
  name: string
  label: string
  score: number
}

export interface LoadedNode {
  id: string
  label: string
  name: string
  degree: number
  properties: Record<string, unknown>
}

export interface DuplicateSuggestion {
  id: string
  score: number
  lexical: number
  nodes: [LoadedNode, LoadedNode]
}

export interface LoadedEdge {
  id: string
  source: string
  target: string
  type: string
}

export interface GraphChunk {
  nodes: LoadedNode[]
  edges: LoadedEdge[]
}

export interface SeedResponse extends GraphChunk {
  total_nodes: number
}

export interface ExpansionResponse extends GraphChunk {
  root: LoadedNode
}

export interface NodeFields {
  name: string
  label: string
  description?: string | null
  aliases?: string[]
}

export interface Space {
  id: string
  name: string
  created_at: string
  article_count: number
  entity_count: number
}

export interface SpaceStats {
  articles: { total: number; by_status: Record<'ok' | 'pending' | 'processing' | 'error', number> }
  entities: { total: number; by_label: { label: string; count: number }[] }
  relationships: number
}

export interface Article {
  id: string
  url: string | null
  title: string | null
  status: 'pending' | 'processing' | 'ok' | 'error'
  error: string | null
  nodes_count: number | null
  edges_count: number | null
  created_at: string
  processed_at: string | null
  batch_id: string | null
}

export type Span = [number, number]

export interface MentionedEntity {
  id: string
  name: string
  label: string
  spans: Span[]
}

export interface ArticleRelationship {
  id: string
  source: string
  source_label: string
  type: string
  target: string
  target_label: string
  spans: Span[]
}

export interface NodeSource {
  article_id: string
  title: string | null
  quotes: string[]
}

export interface ArticleDetail extends Article {
  content: string
  entities: MentionedEntity[]
  relationships: ArticleRelationship[]
}

export interface ArticlesDeleted {
  deleted: string[]
  processing: string[]
}

/** One upload of articles into a space; counts reflect the articles' current status. */
export interface Batch {
  id: string
  space_id: string
  space_name: string
  created_at: string
  total: number
  ok: number
  pending: number
  processing: number
  error: number
  nodes_count: number
  edges_count: number
}

export interface EntityHit {
  id: string
  name: string
  label: string
  space_id: string
  space_name: string
  score: number
}

export interface ArticleHit {
  id: string
  title: string | null
  url: string | null
  space_id: string
  space_name: string
}

export interface SearchResults {
  entities: EntityHit[]
  articles: ArticleHit[]
}
