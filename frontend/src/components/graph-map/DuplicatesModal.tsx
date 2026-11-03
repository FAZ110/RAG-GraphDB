import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, ConfirmPopover, ErrorNote, Modal } from '@/components/deck'
import { SPACES_QUERY_KEY } from '@/hooks/useSpaces'
import { mergeNodes, rejectDuplicate } from '@/services/api'
import type { DuplicateSuggestion, LoadedNode } from '@/types'
import type { MapEdits } from './useMapEdits'
import { duplicatesKey } from './useDuplicates'

export function DuplicatesModal({
  open,
  onOpenChange,
  spaceId,
  suggestions,
  edits,
  onShow,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  suggestions: DuplicateSuggestion[]
  edits: MapEdits
  onShow: (nodeId: string) => void
}) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: duplicatesKey(spaceId) })
  const reject = useMutation({
    mutationFn: (id: string) => rejectDuplicate(spaceId, id),
    onSuccess: refresh,
  })
  // Pairs whose kept node was swapped from the default.
  const [swapped, setSwapped] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  // Pairs handled so far by a bulk action.
  const [done, setDone] = useState(0)

  // The better-connected node is kept by default, as automatic dedup does.
  const pair = (s: DuplicateSuggestion): [keep: LoadedNode, merge: LoadedNode] => {
    const [a, b] = s.nodes
    return a.degree >= b.degree !== swapped.has(s.id) ? [a, b] : [b, a]
  }

  const rejectAll = useMutation({
    mutationFn: async () => {
      setDone(0)
      for (const s of suggestions) {
        await rejectDuplicate(spaceId, s.id)
        setDone((n) => n + 1)
      }
    },
    onSettled: refresh,
  })
  const mergeAll = useMutation({
    mutationFn: async () => {
      setDone(0)
      // A node already folded into another is gone; its other pairs drop out on refetch.
      const gone = new Set<string>()
      for (const s of suggestions) {
        const [keep, merge] = pair(s)
        if (!gone.has(keep.id) && !gone.has(merge.id)) {
          await mergeNodes(spaceId, keep.id, merge.id)
          gone.add(merge.id)
        }
        setDone((n) => n + 1)
      }
    },
    // Once at the end: refreshing the whole map after every pair is what made this slow.
    onSettled: () => {
      void refresh()
      void queryClient.invalidateQueries({ queryKey: ['analysis', spaceId] })
      return queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY })
    },
  })

  const busy =
    edits.merge.isPending || reject.isPending || rejectAll.isPending || mergeAll.isPending
  const error = mergeAll.error ?? rejectAll.error ?? edits.merge.error ?? reject.error
  const resetErrors = () => {
    for (const m of [edits.merge, reject, rejectAll, mergeAll]) m.reset()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Możliwe duplikaty"
      className="inset-x-3 top-[10vh] mx-auto max-h-[80vh] max-w-2xl p-6"
    >
      <h2 className="text-title text-fg">Możliwe duplikaty</h2>
      <p className="mt-1 mb-4 text-sm text-fg-subtle">
        Te węzły są podobne, ale nie na tyle, by scalić je automatycznie. Zdecyduj teraz albo
        zamknij i wróć tu później przyciskiem „Duplikaty”.
      </p>
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {(mergeAll.isPending || rejectAll.isPending) && (
        <div className="mb-3 flex flex-col gap-1.5" role="status">
          <span className="text-sm text-fg-muted">
            {mergeAll.isPending ? 'Scalanie' : 'Pomijanie'} par: {done} z {suggestions.length}
          </span>
          <span className="h-1.5 bg-line-soft">
            <span
              className="block h-full bg-fg transition-[width] spring-quick"
              style={{ width: `${(done / suggestions.length) * 100}%` }}
            />
          </span>
        </div>
      )}
      {suggestions.length > 1 && (
        <div className="mb-3 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => {
              resetErrors()
              rejectAll.mutate()
            }}
          >
            Pomiń wszystkie
          </Button>
          <ConfirmPopover
            open={confirming}
            onOpenChange={(next) => {
              resetErrors()
              setConfirming(next)
            }}
            question={`Scalić wszystkie ${suggestions.length} par?`}
            detail="W każdej parze zostaje węzeł po prawej. Tego nie da się cofnąć."
            confirmLabel="Scal wszystkie"
            onConfirm={() => {
              setConfirming(false)
              mergeAll.mutate()
            }}
          >
            <Button variant="primary" size="sm" disabled={busy}>
              Scal wszystkie
            </Button>
          </ConfirmPopover>
        </div>
      )}
      {suggestions.length === 0 ? (
        <p className="text-sm text-fg-subtle">Brak sugestii do przejrzenia.</p>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              pair={pair(s)}
              busy={busy}
              onSwap={() =>
                setSwapped((prev) => {
                  const next = new Set(prev)
                  if (!next.delete(s.id)) next.add(s.id)
                  return next
                })
              }
              onMerge={(keep, merge) => {
                resetErrors()
                edits.merge.mutate({ keepId: keep.id, mergeId: merge.id })
              }}
              onReject={() => {
                resetErrors()
                reject.mutate(s.id)
              }}
              onShow={onShow}
            />
          ))}
        </ul>
      )}
    </Modal>
  )
}

function SuggestionRow({
  suggestion,
  pair: [keep, merge],
  busy,
  onSwap,
  onMerge,
  onReject,
  onShow,
}: {
  suggestion: DuplicateSuggestion
  pair: [keep: LoadedNode, merge: LoadedNode]
  busy: boolean
  onSwap: () => void
  onMerge: (keep: LoadedNode, merge: LoadedNode) => void
  onReject: () => void
  onShow: (nodeId: string) => void
}) {
  return (
    <li className="border border-line p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <NodeCard node={merge} role="zostanie aliasem" onShow={onShow} />
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 px-1"
          title="Zamień, który węzeł zostaje"
          onClick={onSwap}
        >
          → ⇄
        </Button>
        <NodeCard node={keep} role="zostaje" onShow={onShow} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-fg-subtle">
          podobieństwo {Math.round(suggestion.score * 100)}% · nazwy{' '}
          {Math.round(suggestion.lexical * 100)}%
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onReject}>
            Pomiń
          </Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={() => onMerge(keep, merge)}>
            Scal
          </Button>
        </div>
      </div>
    </li>
  )
}

function NodeCard({
  node,
  role,
  onShow,
}: {
  node: LoadedNode
  role: string
  onShow: (nodeId: string) => void
}) {
  const description = node.properties.description as string | null | undefined
  return (
    <div className="min-w-0">
      <p className="text-xs text-fg-subtle">{role}</p>
      <button
        className="max-w-full truncate text-left text-sm font-semibold text-fg hover:underline"
        title="Pokaż w grafie"
        onClick={() => onShow(node.id)}
      >
        {node.name}
      </button>
      <p className="text-xs text-fg-subtle">
        {node.label} · {node.degree} powiązań
      </p>
      {description && <p className="mt-1 line-clamp-3 text-xs text-fg-muted">{description}</p>}
    </div>
  )
}
