import type { FreshEntity, Home } from '../types/home'
import { API_URL, readError, spaceUrl } from './api'

export const fetchHome = async (since: string | null): Promise<Home> => {
  const query = since ? `?since=${encodeURIComponent(since)}` : ''
  const response = await fetch(`${API_URL}/home${query}`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export const fetchFreshEntities = async (spaceId: string): Promise<FreshEntity[]> => {
  const response = await fetch(`${spaceUrl(spaceId)}/graph/fresh`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}
