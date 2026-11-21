import { SplineIcon } from 'lucide-react'
import { Button } from '@/components/deck'
import type { LoadedNode } from '@/types'
import { AddEntity } from './AddEntity'
import { NodeButton } from './NodeButton'

interface Props {
  spaceId: string
  /** Entities in the question already, left out of the search. */
  inside: ReadonlySet<string>
  full: boolean
  linking: boolean
  /** The known-entity button has turned into its search field. */
  adding: boolean
  onSought: () => void
  onAdding: (on: boolean) => void
  onKnown: (entity: LoadedNode) => void
  onLinking: (on: boolean) => void
  /** Colours of the space's commonest types, the mark of a known entity. */
  inks: readonly string[]
}

/** What a question is drawn with: sought nodes, entities the user knows, links between them. */
export function StageToolbar(props: Props) {
  const { full, linking, adding, onSought, onAdding, onLinking } = props
  return (
    <div role="toolbar" aria-label="Rysowanie pytania" className="flex items-center gap-2">
      <NodeButton
        kind="sought"
        label="Szukana"
        title="Dodaj szukaną encję"
        disabled={full}
        onClick={onSought}
      />
      <AddEntity
        spaceId={props.spaceId}
        inside={props.inside}
        label="Dodaj znaną encję"
        open={adding}
        disabled={full}
        floating
        onOpen={onAdding}
        onPick={props.onKnown}
        trigger={(open) => (
          <NodeButton
            kind="known"
            inks={props.inks}
            label="Znana"
            title="Dodaj znaną encję"
            disabled={full}
            onClick={open}
          />
        )}
      />
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <Button
        size="sm"
        variant={linking ? 'primary' : 'ghost'}
        aria-pressed={linking}
        onClick={() => onLinking(!linking)}
        title="Kliknij dwa węzły, żeby je połączyć, albo przeciągnij od kropki przy węźle"
      >
        <SplineIcon />
        Połącz
      </Button>
    </div>
  )
}
