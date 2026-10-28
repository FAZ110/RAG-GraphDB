import { useSearchParams } from 'react-router-dom'
import { normalize } from '@/lib/text'
import type { AnalysisListItem } from '@/types/analysis'

export const PERIODS = [
  { value: 'any', label: 'Kiedykolwiek', days: null },
  { value: '7', label: 'Ostatnie 7 dni', days: 7 },
  { value: '30', label: 'Ostatnie 30 dni', days: 30 },
  { value: '90', label: 'Ostatnie 3 miesiące', days: 90 },
] as const

export type Period = (typeof PERIODS)[number]['value']

export interface Filters {
  /** Only the space picked in the rail. */
  onlySpace: boolean
  query: string
  /** Spaces to narrow "all" down to; empty keeps every space. */
  spaces: string[]
  period: Period
}

const DAY = 86_400_000

/** The list's filters, kept in the address so going back and sharing keep them. */
function read(params: URLSearchParams): Filters {
  const period = params.get('period')
  return {
    onlySpace: params.get('scope') === 'space',
    query: params.get('q') ?? '',
    spaces: params.get('spaces')?.split(',').filter(Boolean) ?? [],
    period: PERIODS.some((p) => p.value === period) ? (period as Period) : 'any',
  }
}

function write(f: Filters): URLSearchParams {
  const out = new URLSearchParams()
  if (f.onlySpace) out.set('scope', 'space')
  if (f.query) out.set('q', f.query)
  if (f.spaces.length && !f.onlySpace) out.set('spaces', f.spaces.join(','))
  if (f.period !== 'any') out.set('period', f.period)
  return out
}

/** The list's filters, kept in the address so going back and sharing keep them. */
export function useFilters() {
  const [params, setParams] = useSearchParams()
  return {
    filters: read(params),
    // From the address as it is now, not as last rendered, so two changes in a row both land.
    set: (change: Partial<Filters>) =>
      setParams(write({ ...read(new URLSearchParams(window.location.search)), ...change }), {
        replace: true,
      }),
  }
}

/** Whether anything beyond the space tab narrows the list. */
export const narrowed = (f: Filters) =>
  f.query.trim() !== '' || (!f.onlySpace && f.spaces.length > 0) || f.period !== 'any'

export function applyFilters(
  list: AnalysisListItem[],
  f: Filters,
  spaceId: string | undefined,
  now: number
): AnalysisListItem[] {
  const needle = normalize(f.query.trim())
  const days = PERIODS.find((p) => p.value === f.period)?.days ?? null
  return list.filter(
    (a) =>
      (!f.onlySpace || a.space_id === spaceId) &&
      (f.onlySpace || !f.spaces.length || f.spaces.includes(a.space_id)) &&
      (!needle || normalize(a.name).includes(needle)) &&
      (days === null || now - new Date(a.updated_at).getTime() <= days * DAY)
  )
}
