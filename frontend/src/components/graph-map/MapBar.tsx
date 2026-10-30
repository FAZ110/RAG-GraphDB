import { ChartColumnIcon, LoaderCircleIcon, ScanIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react'
import { IconButton, focusRing } from '@/components/deck'
import { SpaceSelect } from '@/components/Spaces/choice/SpaceSelect'
import { ENTITY_FORMS, RELATIONSHIP_FORMS, pluralForm } from '@/components/Spaces/spaceText'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import type { ColorBy } from './types'

interface Props {
  spaces: Space[]
  spaceId: string
  onSpace: (spaceId: string) => void
  nodes: number
  edges: number
  total: number
  layingOut: boolean
  colorBy: ColorBy
  onColorBy: (colorBy: ColorBy) => void
  statsOpen: boolean
  onStats: () => void
  onZoom: (factor: number) => void
  onFit: () => void
}

const COLOR_MODES: { value: ColorBy; label: string }[] = [
  { value: 'type', label: 'Typy' },
  { value: 'community', label: 'Społeczności' },
]

export function MapBar(props: Props) {
  const truncated = props.total > props.nodes
  return (
    <div className="deck pointer-events-auto flex h-12 items-center gap-2 border border-line bg-surface px-2">
      <SpaceSelect
        spaces={props.spaces}
        value={props.spaceId}
        onChange={props.onSpace}
        className="w-44 min-w-0 sm:w-56"
      />
      <span className="hidden truncate text-sm text-fg-subtle tabular-nums md:inline">
        {truncated ? `${props.nodes} z ${props.total}` : props.nodes}{' '}
        {pluralForm(props.total, ENTITY_FORMS)} · {props.edges}{' '}
        {pluralForm(props.edges, RELATIONSHIP_FORMS)}
      </span>
      {props.layingOut && (
        <span className="flex items-center gap-1 text-xs text-fg-subtle">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          <span className="hidden sm:inline">układam</span>
        </span>
      )}

      <span className="ml-auto flex items-center">
        <span role="group" aria-label="Kolorowanie" className="hidden border border-line sm:flex">
          {COLOR_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={props.colorBy === mode.value}
              onClick={() => props.onColorBy(mode.value)}
              className={cn(
                'px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg aria-pressed:bg-fg aria-pressed:text-fg-inverse',
                focusRing
              )}
            >
              {mode.label}
            </button>
          ))}
        </span>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Statystyki grafu"
          aria-pressed={props.statsOpen}
          onClick={props.onStats}
          className="hidden aria-pressed:bg-surface-sunken aria-pressed:text-fg md:inline-flex"
        >
          <ChartColumnIcon />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Oddal"
          onClick={() => props.onZoom(1 / 1.3)}
        >
          <ZoomOutIcon />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-sm"
          label="Przybliż"
          onClick={() => props.onZoom(1.3)}
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton variant="ghost" size="icon-sm" label="Pokaż wszystko (F)" onClick={props.onFit}>
          <ScanIcon />
        </IconButton>
      </span>
    </div>
  )
}
