import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, ErrorNote, Modal } from '../../deck';
import { rejectDuplicate } from '../../../services/api';
import type { DuplicateSuggestion, LoadedNode } from '../../../types';
import type { GraphEdits } from '../hooks/useGraphEdits';
import { duplicatesKey } from '../hooks/useDuplicates';

export function DuplicatesModal({
  open,
  onOpenChange,
  spaceId,
  suggestions,
  edits,
  onShow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  suggestions: DuplicateSuggestion[];
  edits: GraphEdits;
  onShow: (nodeId: string) => void;
}) {
  const queryClient = useQueryClient();
  const reject = useMutation({
    mutationFn: (id: string) => rejectDuplicate(spaceId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: duplicatesKey(spaceId) }),
  });
  const error = edits.merge.error ?? reject.error;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Możliwe duplikaty"
      className="inset-x-3 top-[10vh] mx-auto max-h-[80vh] max-w-2xl p-6"
    >
      <h2 className="text-title text-fg">Możliwe duplikaty</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Te węzły są podobne, ale nie na tyle, by scalić je automatycznie. Zdecyduj teraz albo
        zamknij i wróć tu później przyciskiem „Duplikaty”.
      </p>
      {error && <ErrorNote>{error.message}</ErrorNote>}
      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-500">Brak sugestii do przejrzenia.</p>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              busy={edits.merge.isPending || reject.isPending}
              onMerge={(keep, merge) => {
                reject.reset();
                edits.merge.mutate({ keepId: keep.id, mergeId: merge.id });
              }}
              onReject={() => {
                edits.merge.reset();
                reject.mutate(s.id);
              }}
              onShow={onShow}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

function SuggestionRow({
  suggestion,
  busy,
  onMerge,
  onReject,
  onShow,
}: {
  suggestion: DuplicateSuggestion;
  busy: boolean;
  onMerge: (keep: LoadedNode, merge: LoadedNode) => void;
  onReject: () => void;
  onShow: (nodeId: string) => void;
}) {
  const [a, b] = suggestion.nodes;
  // The better-connected node is kept by default, as automatic dedup does.
  const [keepFirst, setKeepFirst] = useState(a.degree >= b.degree);
  const [keep, merge] = keepFirst ? [a, b] : [b, a];

  return (
    <li className="border border-line p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <NodeCard node={merge} role="zostanie aliasem" onShow={onShow} />
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 px-1"
          title="Zamień, który węzeł zostaje"
          onClick={() => setKeepFirst(!keepFirst)}
        >
          → ⇄
        </Button>
        <NodeCard node={keep} role="zostaje" onShow={onShow} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">
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
  );
}

function NodeCard({
  node,
  role,
  onShow,
}: {
  node: LoadedNode;
  role: string;
  onShow: (nodeId: string) => void;
}) {
  const description = node.properties.description as string | null | undefined;
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{role}</p>
      <button
        className="max-w-full truncate text-left text-sm font-semibold text-fg hover:underline"
        title="Pokaż w grafie"
        onClick={() => onShow(node.id)}
      >
        {node.name}
      </button>
      <p className="text-xs text-gray-500">
        {node.label} · {node.degree} powiązań
      </p>
      {description && <p className="mt-1 line-clamp-3 text-xs text-gray-700">{description}</p>}
    </div>
  );
}
