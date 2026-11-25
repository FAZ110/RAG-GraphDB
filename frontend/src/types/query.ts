import type { LoadedEdge, LoadedNode } from './index'

export type Direction = 'out' | 'in' | 'any'
/** Whether a link must exist, may exist, or must not exist. */
export type LinkMode = 'required' | 'optional' | 'not'
/** A relationship between the two, or an article mentioning both. */
export type LinkVia = 'relation' | 'articles'

/** The type of the links the answer gives for "mentioned together"; no relationship has it. */
export const MENTIONED_TOGETHER = 'WSPOMNIANE_RAZEM'

/** A pattern as the API takes it: known nodes carry ids, sought ones the conditions. */
export interface QueryBody {
  nodes: {
    key: string
    ids?: string[]
    label?: string
    link_count?: { min: number; type?: string; label?: string }
    name_contains?: string
    at_least?: number
  }[]
  edges: {
    source: string
    target: string
    type?: string
    direction: Direction
    min_hops: number
    max_hops: number
    mode: LinkMode
    via: LinkVia
  }[]
  limit?: number
  /** How many ranked matches come before this page. */
  skip?: number
  /** Only these entities may answer the sought nodes. */
  within?: string[]
}

export interface QueryResult {
  /** Which entity stands for each sought node, best connected first; null when optional and missing. */
  matches: Record<string, string | null>[]
  /** Matches over every page. */
  total: number
  counts: Record<string, number>
  /** For sought nodes with a count condition: what it came to for each entity, by key. */
  counted: Record<string, Record<string, number>>
  nodes: LoadedNode[]
  edges: LoadedEdge[]
  truncated: boolean
  cypher: string
  /** The values the Cypher was run with, the space it was scoped to left out. */
  params: Record<string, unknown>
}

export interface SpaceSchema {
  labels: { label: string; count: number }[]
  /** Which type links to which, by which relationship, as stored (source to target). */
  relations: { source: string; type: string; target: string; count: number }[]
}

/** A question in words as a language model drew it; `missing` are names no entity has. */
export interface PatternFromText {
  pattern: QueryBody
  entities: LoadedNode[]
  missing: string[]
}
