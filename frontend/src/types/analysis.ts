import type { LoadedEdge, LoadedNode } from './index'

export interface LabelCount {
  label: string
  count: number
}

export interface AnalysisSummary {
  id: string
  space_id: string
  name: string
  created_at: string
  updated_at: string
  entity_count: number
  labels: LabelCount[]
}

export interface AnalysisListItem extends AnalysisSummary {
  space_name: string
}

export interface Point {
  x: number
  y: number
}

export interface Viewport extends Point {
  zoom: number
}

export interface CanvasEntity extends LoadedNode, Point {}

export interface Analysis extends AnalysisSummary {
  revision: number
  viewport: Viewport | null
  entities: CanvasEntity[]
  edges: LoadedEdge[]
  article_ids: string[]
}

export interface PlacedId extends Point {
  id: string
}

export interface CanvasChanges {
  revision: number
  place?: PlacedId[]
  remove?: string[]
  cite?: string[]
  uncite?: string[]
}

export interface CanvasSaved {
  revision: number
  updated_at: string
}

export interface RelationGroup {
  direction: 'in' | 'out'
  type: string
  label: string
  count: number
}

export interface Subgraph {
  nodes: LoadedNode[]
  edges: LoadedEdge[]
}

export interface CommonResult extends Subgraph {
  nodes: (LoadedNode & { shared: string[] })[]
  total: number
}

export interface PathResult {
  nodes: LoadedNode[]
  paths: { node_ids: string[]; edges: LoadedEdge[] }[]
}

export interface EntityPage {
  nodes: LoadedNode[]
  total: number
}

export interface SourceArticle {
  id: string
  title: string | null
  url: string | null
  created_at: string
  entity_ids: string[]
}
