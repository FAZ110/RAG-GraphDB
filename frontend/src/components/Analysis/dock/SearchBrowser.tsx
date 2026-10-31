import { ArrowRightIcon, CheckIcon } from 'lucide-react'
import { Kbd, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import type { SearchScope } from './searchResults'
import { SearchRow } from './SearchRow'
import { SearchScopes } from './SearchScopes'
import { TypeChips } from './TypeChips'
import type { DockSearchState } from './useDockSearch'

const MORE: Partial<Record<SearchScope, string>> = {
  article: 'Wszystkie artykuły',
  entity: 'Wszystkie encje',
  type: 'Wszystkie typy',
}

/**
 * The space's articles, entities and types to browse and pick from, opened inside the dock
 * while its search field has focus.
 */
export function SearchBrowser({
  search,
  addedToggle = true,
  pickLabel = 'dodaj',
}: {
  search: DockSearchState
  addedToggle?: boolean
  pickLabel?: string
}) {
  const { sections, needle, typed, loading, error, current } = search
  const empty = !sections.length
  // Where each section's hits start in the one list the arrow keys walk.
  const starts = sections.map((_, k) =>
    sections.slice(0, k).reduce((sum, s) => sum + s.hits.length, 0)
  )

  return (
    // Clicks in here keep the field focused, so the dock stays open and typing carries on.
    <div
      data-dock-search
      onMouseDown={(e) => e.preventDefault()}
      className="flex h-[min(26rem,55vh)] flex-col"
    >
      <div className="border-b border-line-soft">
        <div className="flex items-center justify-between gap-3 pr-3">
          <SearchScopes scopes={search.scopes} scope={search.scope} onChange={search.showScope} />
          {addedToggle && search.scope !== 'type' && (
            <button
              type="button"
              aria-pressed={search.hideAdded}
              onClick={search.toggleAdded}
              className={cn(
                'flex shrink-0 items-center gap-1.5 text-xs text-fg-subtle select-none hover:text-fg',
                focusRing
              )}
            >
              <span
                className={cn(
                  'flex size-3.5 items-center justify-center border',
                  search.hideAdded ? 'border-fg bg-fg text-fg-inverse' : 'border-fg-faint'
                )}
              >
                {search.hideAdded && <CheckIcon className="size-3" strokeWidth={3} />}
              </span>
              Ukryj dodane
              {search.added > 0 && <span className="tabular-nums">({search.added})</span>}
            </button>
          )}
        </div>
        {search.scope === 'entity' && (
          <TypeChips labels={search.labels} label={search.label} onChange={search.showLabel} />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {error && <p className="px-3 py-2 text-sm text-danger">{error.message}</p>}
        {loading && empty && <p className="px-3 py-2 text-sm text-fg-subtle">Wczytuję…</p>}
        {!loading && empty && (
          <p className="px-3 py-2 text-sm text-fg-subtle">
            {typed ? `Nic nie pasuje do „${search.query.trim()}”` : 'Ta przestrzeń jest pusta'}
          </p>
        )}
        {sections.map((section, k) => (
          <section key={section.key} aria-label={section.title} className="pb-1">
            <h3 className="px-3 pt-2 pb-1 text-xs font-semibold text-fg-subtle">{section.title}</h3>
            <ul role="listbox" aria-label={section.title}>
              {section.hits.map((hit, j) => {
                const i = starts[k] + j
                return (
                  <SearchRow
                    key={`${hit.kind}:${hit.id}`}
                    hit={hit}
                    needle={needle}
                    active={i === current}
                    onCanvas={hit.kind === 'entity' && search.onCanvas(hit.id)}
                    onHover={() => search.point(i)}
                    onPick={() => search.pick(hit)}
                  />
                )
              })}
            </ul>
            {section.more && (
              <button
                type="button"
                onClick={() => search.showScope(section.more!.scope)}
                className={cn(
                  'flex w-full items-center gap-1 px-3 py-1.5 text-left text-xs font-semibold text-fg-subtle hover:text-fg',
                  focusRing
                )}
              >
                {MORE[section.more.scope]} ({section.more.count})
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </section>
        ))}
      </div>
      <p className="flex items-center gap-3 border-t border-line-soft px-3 py-1.5 text-xs text-fg-subtle">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> wybierz
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> {pickLabel}
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Tab</Kbd> zakres
        </span>
      </p>
    </div>
  )
}
