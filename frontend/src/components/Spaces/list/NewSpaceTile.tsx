import { PlusIcon } from 'lucide-react'
import { AddTile, AddTileIcon, Button, EmptyState } from '@/components/deck'

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
        <AddTile onClick={onCreate}>
          <AddTileIcon />
          Nowa przestrzeń
        </AddTile>
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
