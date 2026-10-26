import { PlusIcon } from 'lucide-react'
import { Button, EmptyState } from '@/components/deck'
import { PENCIL } from '@/design/inks'
import { SearchMiss } from '../SearchMiss'
import { SpacesMark } from '../SpacesMark'

interface Props {
  name: string
  onCreate: () => void
}

export function NoSpaceMatch({ name, onCreate }: Props) {
  return (
    <li className="px-5 py-8">
      <EmptyState
        title="Nic nie znaleziono"
        art={
          <SearchMiss ink={PENCIL}>
            <SpacesMark />
          </SearchMiss>
        }
        action={
          <Button className="max-w-full" onClick={onCreate}>
            <PlusIcon />
            <span className="truncate">Utwórz „{name}”</span>
          </Button>
        }
        framed={false}
        className="p-0"
      >
        Nie masz przestrzeni o nazwie „{name}”.
      </EmptyState>
    </li>
  )
}
