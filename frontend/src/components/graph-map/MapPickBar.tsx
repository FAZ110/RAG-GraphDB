import { ArrowLeftRightIcon, XIcon } from 'lucide-react'
import { Button, ErrorNote, IconButton, Kbd } from '@/components/deck'
import { EdgeTypeForm } from './EditForms'
import type { PickKind } from './types'
import type { MapEdits } from './useMapEdits'

interface Named {
  id: string
  name: string
}

interface Props {
  kind: PickKind
  from: Named
  to: Named | null
  edits: MapEdits
  onSwap: () => void
  onDone: (selectId: string) => void
  onCancel: () => void
}

export function MapPickBar({ kind, from, to, edits, onSwap, onDone, onCancel }: Props) {
  if (!to) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="text-fg-muted">
          Kliknij encję na mapie, {kind === 'merge' ? 'z którą scalić' : 'z którą powiązać'}{' '}
          <span className="font-semibold text-fg">{from.name}</span>
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Anuluj <Kbd>Esc</Kbd>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-fg">
          <span className="font-semibold">{from.name}</span>
          <span className="text-fg-muted">
            {kind === 'merge' ? ' zostanie włączony w ' : ' → '}
          </span>
          <span className="font-semibold">{to.name}</span>
        </p>
        <IconButton variant="ghost" size="icon-sm" label="Zamień kierunek" onClick={onSwap}>
          <ArrowLeftRightIcon />
        </IconButton>
        <IconButton variant="ghost" size="icon-sm" label="Anuluj (Esc)" onClick={onCancel}>
          <XIcon />
        </IconButton>
      </div>
      {kind === 'merge' ? (
        <>
          <p className="text-xs text-fg-subtle">
            Wzmianki, powiązania i aliasy przejdą do „{to.name}”, a „{from.name}” zostanie jego
            aliasem i zniknie z grafu.
          </p>
          {edits.merge.error && <ErrorNote>{edits.merge.error.message}</ErrorNote>}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={edits.merge.isPending}
              onClick={() =>
                edits.merge.mutate(
                  { keepId: to.id, mergeId: from.id },
                  { onSuccess: () => onDone(to.id) }
                )
              }
            >
              {edits.merge.isPending ? 'Scalam…' : 'Scal'}
            </Button>
          </div>
        </>
      ) : (
        <EdgeTypeForm
          initial=""
          pending={edits.addEdge.isPending}
          error={edits.addEdge.error?.message ?? null}
          submitLabel="Powiąż"
          onSubmit={(type) =>
            edits.addEdge.mutate(
              { source: from.id, target: to.id, type },
              { onSuccess: () => onDone(from.id) }
            )
          }
          onCancel={onCancel}
        />
      )}
    </div>
  )
}
