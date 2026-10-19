import { CheckIcon, PlusIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { focusRing } from '@/components/deck'
import { ARTICLE_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { SpaceMark } from './SpaceMark'

interface Props {
  spaces: Space[]
  currentId: string
  onPick: (spaceId: string) => void
  onNew: () => void
}

export function SpaceSwitchList({ spaces, currentId, onPick, onNew }: Props) {
  return (
    <>
      <p className="px-2 pt-1 pb-2 text-xs font-semibold text-fg-subtle">Przestrzenie</p>
      <ul className="max-h-80 overflow-y-auto">
        {spaces.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              aria-current={s.id === currentId ? 'true' : undefined}
              className={cn(
                'group flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-surface-sunken focus-visible:ring-inset',
                focusRing
              )}
            >
              <SpaceMark space={s} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{s.name}</span>
                <span className="block text-xs text-fg-subtle">
                  {s.article_count} {pluralForm(s.article_count, ARTICLE_FORMS)}
                </span>
              </span>
              {s.id === currentId && <CheckIcon className="size-4 shrink-0 text-fg" />}
            </button>
          </li>
        ))}
      </ul>
      <Link
        to="/spaces?new"
        onClick={onNew}
        className={cn(
          'mt-1 flex items-center gap-2 border-t border-line-soft px-2 pt-2.5 pb-1.5 text-sm font-semibold text-fg-muted hover:text-fg',
          focusRing
        )}
      >
        <PlusIcon className="size-4" />
        Nowa przestrzeń
      </Link>
    </>
  )
}
