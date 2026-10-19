import { useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/deck'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useSpaces } from '@/hooks/useSpaces'
import { normalize } from '@/lib/text'
import { useOpenAddArticles } from '../Spaces/add/addArticlesContext'
import { SearchResults } from './SearchResults'
import { searchItems } from './searchItems'
import type { SearchItem } from './searchItems'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Szukaj w Atlasie"
      className="inset-x-3 top-[12vh] mx-auto max-h-[70vh] max-w-xl"
    >
      {/* Mounted only while open, so every opening starts with an empty query. */}
      {open && <SearchBody close={() => onOpenChange(false)} />}
    </Modal>
  )
}

function SearchBody({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const openAdd = useOpenAddArticles()
  const spaces = useSpaces().data ?? []
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const search = useGlobalSearch(query)

  const items = searchItems({
    needle: normalize(query.trim()),
    spaces,
    results: search.data,
    openAdd: () => openAdd(),
  })
  const current = Math.min(active, items.length - 1)
  const run = (item: SearchItem | undefined) => {
    if (!item) return
    close()
    if (typeof item.to === 'string') navigate(item.to)
    else item.to()
  }

  return (
    <div className="flex min-h-0 flex-col">
      <label className="flex items-center gap-3 border-b border-line-soft px-4">
        <SearchIcon className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive(Math.min(current + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive(Math.max(current - 1, 0))
            } else if (e.key === 'Enter') {
              run(items[current])
            }
          }}
          placeholder="Przestrzeń, encja, artykuł albo polecenie"
          aria-label="Szukaj"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
        />
        {search.isFetching && <span className="text-xs text-fg-faint">Szukam…</span>}
      </label>
      <SearchResults items={items} active={current} query={query} onHover={setActive} onRun={run} />
    </div>
  )
}
