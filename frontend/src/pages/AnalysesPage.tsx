import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnalysesFilters } from '@/components/Analysis/list/AnalysesFilters'
import { AnalysisGrid } from '@/components/Analysis/list/AnalysisGrid'
import { applyFilters, narrowed, useFilters } from '@/components/Analysis/list/filters'
import { NewAnalysis } from '@/components/Analysis/list/NewAnalysis'
import { ScopeTabs } from '@/components/Analysis/list/ScopeTabs'
import { Button, EmptyState, ErrorNote } from '@/components/deck'
import { useCurrentSpace } from '@/components/nav/useCurrentSpace'
import { fetchAllAnalyses } from '@/services/analyses'

export function AnalysesPage() {
  const { space, spaces } = useCurrentSpace()
  const analyses = useQuery({ queryKey: ['analyses', 'all'], queryFn: fetchAllAnalyses })
  const { filters, set } = useFilters()
  // Fixed while the page is open, so "the last 30 days" doesn't shift under the cards.
  const [now] = useState(() => Date.now())
  const all = analyses.data ?? []
  const shown = applyFilters(
    all,
    { ...filters, onlySpace: filters.onlySpace && !!space },
    space?.id,
    now
  )
  const hasSpaces = spaces.length > 0
  const ofSpace = all.filter((a) => a.space_id === space?.id)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-4">
      <h1 className="text-display text-fg @md:text-display-lg">Analizy</h1>
      {/* Which analyses are listed: the tabs pick the space, the filters narrow it down. */}
      {all.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line-soft pb-px">
          <ScopeTabs
            space={space}
            onlySpace={filters.onlySpace && !!space}
            counts={{ all: all.length, space: ofSpace.length }}
            onChange={(onlySpace) => set({ onlySpace })}
          />
          <div className="pb-2">
            <AnalysesFilters filters={filters} spaces={spaces} onChange={set} />
          </div>
        </div>
      )}
      {analyses.error && <ErrorNote>{analyses.error.message}</ErrorNote>}
      {analyses.data && !hasSpaces && (
        <EmptyState
          title="Najpierw przestrzeń"
          className="min-h-80"
          action={
            <Button asChild>
              <Link to="/spaces">Utwórz przestrzeń</Link>
            </Button>
          }
        >
          Analiza zbiera encje z artykułów przestrzeni, więc zacznij od dodania artykułów.
        </EmptyState>
      )}
      {analyses.data && space && (
        <AnalysisGrid
          all={all}
          shown={shown}
          leading={<NewAnalysis space={space} spaces={spaces} />}
        />
      )}
      {analyses.data && shown.length === 0 && narrowed(filters) && (
        <p className="flex items-center gap-3 text-sm text-fg-subtle">
          Żadna analiza nie pasuje do filtrów.
          <Button
            size="sm"
            variant="ghost"
            onClick={() => set({ query: '', spaces: [], period: 'any' })}
          >
            Wyczyść filtry
          </Button>
        </p>
      )}
    </div>
  )
}
