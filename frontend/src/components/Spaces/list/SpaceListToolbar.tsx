import { PlusIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { SpaceSearchField } from './SpaceSearchField'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  status: string
  onNewSpace: () => void
}

export function SpaceListToolbar({ query, onQueryChange, status, onNewSpace }: Props) {
  return (
    <div className="flex items-stretch gap-2 pr-2">
      <SpaceSearchField query={query} onQueryChange={onQueryChange} status={status} />
      <IconButton variant="primary" size="icon-2xl" label="Nowa przestrzeń" onClick={onNewSpace}>
        <PlusIcon />
      </IconButton>
    </div>
  )
}
