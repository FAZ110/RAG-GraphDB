import { useRef } from 'react'
import { XIcon } from 'lucide-react'
import { Kbd, SearchField, SearchFieldButton } from '@/components/deck'
import { useFocusShortcut } from '@/hooks/useFocusShortcut'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  status: string
}

export function SpaceSearchField({ query, onQueryChange, status }: Props) {
  const input = useRef<HTMLInputElement>(null)
  useFocusShortcut(input, '/')

  return (
    <SearchField
      ref={input}
      size="md"
      className="flex-1"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Escape' && onQueryChange('')}
      placeholder="Szukaj przestrzeni"
      aria-label="Szukaj przestrzeni po nazwie"
      aria-keyshortcuts="/"
      status={status}
      action={
        query ? (
          <SearchFieldButton label="Wyczyść wyszukiwanie" onClick={() => onQueryChange('')}>
            <XIcon className="size-4" />
          </SearchFieldButton>
        ) : (
          <Kbd>/</Kbd>
        )
      }
    />
  )
}
