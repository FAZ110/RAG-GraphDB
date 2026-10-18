import { cn } from '@/lib/utils'
import type { SearchItem } from './searchItems'

interface Props {
  items: SearchItem[]
  active: number
  query: string
  onHover: (index: number) => void
  onRun: (item: SearchItem) => void
}

export function SearchResults({ items, active, query, onHover, onRun }: Props) {
  return (
    <ul role="listbox" aria-label="Wyniki" className="min-h-0 overflow-y-auto py-2">
      {items.map((item, i) => (
        <li key={item.key} role="option" aria-selected={i === active}>
          {(i === 0 || items[i - 1].section !== item.section) && (
            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-fg-subtle">{item.section}</p>
          )}
          <button
            type="button"
            tabIndex={-1}
            onMouseEnter={() => onHover(i)}
            onClick={() => onRun(item)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-left text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle',
              i === active ? 'bg-surface-sunken text-fg' : 'text-fg-soft'
            )}
          >
            {item.icon}
            <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
            {item.detail && (
              <span className="max-w-[45%] shrink-0 truncate text-fg-subtle">{item.detail}</span>
            )}
          </button>
        </li>
      ))}
      {items.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-fg-subtle">
          Nic nie pasuje do „{query.trim()}”.
        </li>
      )}
    </ul>
  )
}
