import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchSections } from './searchResults'
import type { RelationCount, SearchHit, SearchScope } from './searchResults'

const nextScope = (scopes: { scope: SearchScope }[], scope: SearchScope, step: number) => {
  const i = scopes.findIndex((s) => s.scope === scope)
  return scopes[(i + step + scopes.length) % scopes.length].scope
}

/**
 * The dock search's state, shared by its field and the list it opens inside the dock: what is
 * typed, which tab and type are shown, which row is picked out, and whether it is open.
 */
export function useDockSearch(
  spaceId: string,
  onCanvas: (id: string) => boolean,
  placedOf: (articleId: string) => number,
  onPick: (hit: SearchHit) => void,
  relations?: RelationCount[]
) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [label, setLabel] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  // Entities already on the canvas are left out until asked for.
  const [hideAdded, setHideAdded] = useState(true)
  const results = useSearchSections(
    spaceId,
    query,
    scope,
    label,
    onCanvas,
    placedOf,
    hideAdded,
    relations
  )
  const hits = results.sections.flatMap((s) => s.hits)
  const current = Math.min(active, Math.max(hits.length - 1, 0))

  const pick = (hit: SearchHit) => {
    onPick(hit)
    setQuery('')
    setOpen(false)
  }
  const showScope = (next: SearchScope) => {
    setScope(next)
    setActive(0)
  }

  return {
    ...results,
    query,
    scope,
    label,
    current,
    open,
    onCanvas,
    pick,
    showScope,
    hideAdded,
    toggleAdded: () => {
      setHideAdded((h) => !h)
      setActive(0)
    },
    showLabel: (next: string | null) => {
      setLabel(next)
      setActive(0)
    },
    point: setActive,
    setOpen,
    type: (next: string) => {
      setQuery(next)
      setActive(0)
      setOpen(true)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
        const step = e.key === 'ArrowDown' ? 1 : -1
        setActive((current + step + hits.length) % Math.max(hits.length, 1))
      } else if (e.key === 'Tab' && open) {
        e.preventDefault()
        showScope(nextScope(results.scopes, scope, e.shiftKey ? -1 : 1))
      } else if (e.key === 'Enter' && hits[current]) {
        e.preventDefault()
        pick(hits[current])
      } else if (e.key === 'Escape') {
        if (query) setQuery('')
        else e.currentTarget.blur()
      }
    },
  }
}

export type DockSearchState = ReturnType<typeof useDockSearch>
