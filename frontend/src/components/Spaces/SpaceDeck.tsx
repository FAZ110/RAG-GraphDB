import type { KeyboardEvent, Ref } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from 'lucide-react'

interface Props {
  /** Name of the slide in the centre of the carousel. */
  name: string
  position: number
  total: number
  searching: boolean
  query: string
  /** Shown at the end of the field while searching, e.g. the number of matches. */
  searchStatus: string
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
  onSearchStart: () => void
  onSearchEnd: () => void
  onQueryChange: (query: string) => void
  onSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  /** Lets the page focus the field from a keyboard shortcut. */
  inputRef?: Ref<HTMLInputElement>
}

// The controls under the carousel. Its middle field names the centred space and is
// also the search box: focusing it slips a search card into the carousel.
export function SpaceDeck({
  name,
  position,
  total,
  searching,
  query,
  searchStatus,
  onPrev,
  onNext,
  onAdd,
  onSearchStart,
  onSearchEnd,
  onQueryChange,
  onSearchKeyDown,
  inputRef,
}: Props) {
  const segment =
    'flex h-12 shrink-0 items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900'

  return (
    <div className="relative flex w-full min-w-0 items-stretch gap-3">
      <div className="deck flex min-w-0 flex-1 items-stretch border border-slate-300 bg-white">
        <button
          type="button"
          aria-label="Poprzednia przestrzeń"
          onClick={onPrev}
          className={`${segment} w-12 border-r border-slate-200`}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <label className="flex min-w-0 flex-1 cursor-text items-center gap-2 px-3 focus-within:bg-slate-50">
          <SearchIcon className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={searching}
            aria-controls="space-search-list"
            aria-label="Szukaj przestrzeni po nazwie"
            aria-keyshortcuts="/ Meta+K Control+K"
            value={searching ? query : name}
            placeholder={searching ? 'Szukaj przestrzeni po nazwie' : name}
            onFocus={onSearchStart}
            onBlur={onSearchEnd}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
          />
          {searching ? (
            <span className="shrink-0 text-xs text-slate-500 tabular-nums" aria-live="polite">
              {searchStatus}
            </span>
          ) : (
            <>
              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                {position} z {total}
              </span>
              <kbd className="hidden shrink-0 border border-slate-300 px-1.5 font-sans text-xs text-slate-500 sm:inline">
                /
              </kbd>
            </>
          )}
        </label>
        <button
          type="button"
          aria-label="Następna przestrzeń"
          onClick={onNext}
          className={`${segment} w-12 border-l border-slate-200`}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Nowa przestrzeń"
        title="Nowa przestrzeń"
        className="deck-button flex h-12 shrink-0 items-center gap-2 border border-slate-900 bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <PlusIcon className="size-5" />
        <span className="hidden sm:inline">Nowa</span>
      </button>
    </div>
  )
}
