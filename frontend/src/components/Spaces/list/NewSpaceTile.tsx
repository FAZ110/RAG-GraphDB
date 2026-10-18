import { PlusIcon } from 'lucide-react'
import { Button, EmptyState, dashedFrame, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'

interface Props {
  height: number
  /** A search without matches, offered as the new space's name. */
  name?: string
  onCreate: () => void
}

export function NewSpaceTile({ height, name, onCreate }: Props) {
  return (
    <li className="p-3" style={{ height }}>
      {name === undefined ? (
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            dashedFrame,
            'flex size-full items-center justify-center gap-2 px-4 text-sm font-semibold text-fg-subtle hover:border-fg hover:text-fg',
            focusRing
          )}
        >
          <PlusIcon className="size-5" aria-hidden="true" />
          Nowa przestrzeń
        </button>
      ) : (
        <EmptyState
          title="Nic nie znaleziono"
          action={
            <Button className="max-w-full" onClick={onCreate}>
              <PlusIcon />
              <span className="truncate">Utwórz „{name}”</span>
            </Button>
          }
          className="size-full bg-transparent px-4 py-0"
        >
          Nie masz przestrzeni o nazwie „{name}”.
        </EmptyState>
      )}
    </li>
  )
}
