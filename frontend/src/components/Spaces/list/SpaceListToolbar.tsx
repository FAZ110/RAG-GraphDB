import { ChevronsLeftIcon, ChevronsRightIcon, PlusIcon } from 'lucide-react'
import { IconButton } from '@/components/deck'
import { SpaceSearchField } from './SpaceSearchField'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  status: string
  onNewSpace: () => void
  expanded: boolean
  /** Omitted where the list can't spread, which hides the toggle. */
  onExpandedChange?: (expanded: boolean) => void
}

export function SpaceListToolbar({
  query,
  onQueryChange,
  status,
  onNewSpace,
  expanded,
  onExpandedChange,
}: Props) {
  return (
    <div className="flex items-stretch gap-2 pr-2">
      <SpaceSearchField query={query} onQueryChange={onQueryChange} status={status} />
      <IconButton variant="primary" size="icon-2xl" label="Nowa przestrzeń" onClick={onNewSpace}>
        <PlusIcon />
      </IconButton>
      {onExpandedChange && (
        <IconButton
          size="icon-2xl"
          label={expanded ? 'Zwiń listę' : 'Rozwiń listę na całą szerokość'}
          aria-pressed={expanded}
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? <ChevronsLeftIcon /> : <ChevronsRightIcon />}
        </IconButton>
      )}
    </div>
  )
}
