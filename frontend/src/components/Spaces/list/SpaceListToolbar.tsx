import { PanelLeftCloseIcon, PlusIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { SpaceSearchField } from './SpaceSearchField'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  status: string
  onNewSpace: () => void
  /** Omitted where the list can't be put away. */
  onHide?: () => void
}

export function SpaceListToolbar({ query, onQueryChange, status, onNewSpace, onHide }: Props) {
  return (
    <div className="flex items-stretch gap-2 pr-2">
      <SpaceSearchField query={query} onQueryChange={onQueryChange} status={status} />
      <IconButton variant="primary" size="icon-2xl" label="Nowa przestrzeń" onClick={onNewSpace}>
        <PlusIcon />
      </IconButton>
      {onHide && (
        <IconButton size="icon-2xl" label="Schowaj listę" onClick={onHide}>
          <PanelLeftCloseIcon />
        </IconButton>
      )}
    </div>
  )
}
