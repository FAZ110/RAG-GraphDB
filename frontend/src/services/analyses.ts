import type {
  Analysis,
  AnalysisListItem,
  AnalysisSummary,
  CanvasChanges,
  CanvasSaved,
  CommonResult,
  EntityPage,
  PathResult,
  PlacedId,
  RelationGroup,
  SourceArticle,
  Subgraph,
  Viewport,
} from '../types/analysis'
import type { ExpansionResponse } from '../types'
import { API_URL, readError, spaceUrl } from './api'

/** Thrown when another tab saved the analysis first; the editor reloads it. */
export class RevisionConflict extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 409) throw new RevisionConflict(await readError(response))
  if (!response.ok) throw new Error(await readError(response))
  return response.status === 204 ? (undefined as T) : response.json()
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

const analysesUrl = (spaceId: string) => `${spaceUrl(spaceId)}/analyses`
const graphUrl = (spaceId: string) => `${spaceUrl(spaceId)}/graph`

export const fetchAllAnalyses = () => request<AnalysisListItem[]>(`${API_URL}/analyses`)

export const fetchAnalyses = (spaceId: string) => request<AnalysisSummary[]>(analysesUrl(spaceId))

export const fetchAnalysis = (spaceId: string, id: string) =>
  request<Analysis>(`${analysesUrl(spaceId)}/${encodeURIComponent(id)}`)

export const createAnalysis = (
  spaceId: string,
  body: { name: string; entities: PlacedId[]; article_ids: string[] }
) => request<Analysis>(analysesUrl(spaceId), json('POST', body))

export const updateAnalysis = (
  spaceId: string,
  id: string,
  body: { name?: string; viewport?: Viewport }
) => request<void>(`${analysesUrl(spaceId)}/${encodeURIComponent(id)}`, json('PATCH', body))

export const saveCanvas = (spaceId: string, id: string, changes: CanvasChanges) =>
  request<CanvasSaved>(
    `${analysesUrl(spaceId)}/${encodeURIComponent(id)}/canvas`,
    json('PATCH', changes)
  )

export const deleteAnalysis = (spaceId: string, id: string) =>
  request<void>(`${analysesUrl(spaceId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const fetchSubgraph = (spaceId: string, ids: string[]) =>
  request<Subgraph>(`${graphUrl(spaceId)}/subgraph`, json('POST', { ids }))

export const fetchRelationGroups = (spaceId: string, nodeId: string) =>
  request<RelationGroup[]>(`${graphUrl(spaceId)}/nodes/${encodeURIComponent(nodeId)}/relations`)

export const fetchNeighbours = (spaceId: string, nodeId: string, limit = 500) =>
  request<ExpansionResponse>(
    `${graphUrl(spaceId)}/nodes/${encodeURIComponent(nodeId)}/neighbours?limit=${limit}`
  )

export const fetchCommon = (spaceId: string, ids: string[], label?: string) =>
  request<CommonResult>(`${graphUrl(spaceId)}/common`, json('POST', { ids, label, limit: 200 }))

export const fetchPaths = (spaceId: string, sourceId: string, targetId: string, k = 3) =>
  request<PathResult>(
    `${graphUrl(spaceId)}/paths`,
    json('POST', { source_id: sourceId, target_id: targetId, k })
  )

export const fetchEntitiesOfType = (spaceId: string, label: string, limit = 200) =>
  request<EntityPage>(
    `${graphUrl(spaceId)}/nodes?label=${encodeURIComponent(label)}&limit=${limit}`
  )

export const fetchSources = (spaceId: string, ids: string[]) =>
  request<SourceArticle[]>(`${graphUrl(spaceId)}/sources`, json('POST', { ids }))

export const reorderAnalyses = (analysisIds: string[]) =>
  request<void>(`${API_URL}/analyses/order`, json('PUT', { analysis_ids: analysisIds }))
