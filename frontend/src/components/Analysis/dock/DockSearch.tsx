import type { Ref } from 'react'
import { Kbd, SearchField } from '@/components/deck'
import type { DockSearchState } from './useDockSearch'

interface Props {
  search: DockSearchState
  inputRef: Ref<HTMLInputElement>
}

/** The dock's search field; focused, it opens the dock onto the space's contents. */
export function DockSearch({ search, inputRef }: Props) {
  return (
    <div className="min-w-0 flex-1">
      <SearchField
        ref={inputRef}
        size="md"
        placeholder="Szukaj encji, artykułu lub typu"
        value={search.query}
        // The dock is the field's frame; a second one inside it would box it in twice.
        className="border-transparent bg-transparent [--deck-shadow:transparent] focus-within:border-transparent"
        action={<Kbd>/</Kbd>}
        onFocus={() => search.setOpen(true)}
        onBlur={(e) => {
          // Focus moving into the open list stays with the field, so the list stays open.
          if (e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-dock-search]')) {
            e.currentTarget.focus()
            return
          }
          search.setOpen(false)
        }}
        onChange={(e) => search.type(e.target.value)}
        onKeyDown={search.onKeyDown}
      />
    </div>
  )
}
