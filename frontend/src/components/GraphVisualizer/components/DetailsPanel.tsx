import { useState } from 'react';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEdgeSources, useNodeSources } from '../../../hooks/useSpaces';
import type { NodeSource } from '../../../types';
import { ArticlePreview } from '../../Spaces/preview/ArticlePreview';
import { Button, ConfirmDialog, ErrorNote } from '../../deck';
import type { GraphEdits } from '../hooks/useGraphEdits';
import { EdgeTypeForm, NodeForm } from './EditForms';

export type PickKind = 'merge' | 'link';

// Dialogs open over the page, which can't show over an element in native fullscreen.
const leaveFullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
};

export interface SelectedNode {
  id: string;
  label: string;
  category: string;
  degree: number;
  visibleDegree: number;
  expanded: boolean;
  description: string | null;
  aliases: string[];
}

interface DetailsPanelProps {
  spaceId: string;
  node: SelectedNode;
  isPending: boolean;
  edits: GraphEdits;
  onToggleExpand: () => void;
  onStartPick: (kind: PickKind) => void;
  onClose: () => void;
}

export interface SelectedEdge {
  id: string;
  type: string;
  source: string;
  target: string;
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    // Stops above the "+ Węzeł" and fullscreen buttons pinned to the canvas bottom.
    <div className="absolute top-2 right-2 z-10 w-64 max-h-[calc(100%-4rem)] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DeleteControl({
  title,
  description,
  mutation,
  onDelete,
}: {
  title: string;
  description: string;
  mutation: { isPending: boolean; error: Error | null; reset: () => void };
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="danger-outline"
        size="sm"
        onClick={() => {
          leaveFullscreen();
          mutation.reset();
          setOpen(true);
        }}
      >
        Usuń
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        error={mutation.error?.message}
        confirmLabel="Usuń"
        pending={mutation.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}

export function EdgeDetailsPanel({
  spaceId,
  edge,
  edits,
  onReplaced,
  onClose,
}: {
  spaceId: string;
  edge: SelectedEdge;
  edits: GraphEdits;
  onReplaced: (edgeId: string) => void;
  onClose: () => void;
}) {
  const sources = useEdgeSources(spaceId, edge.id);
  const [editing, setEditing] = useState(false);
  const ends = `${edge.source} → ${edge.target}`;

  return (
    <Panel title="Powiązanie" onClose={onClose}>
      {editing ? (
        <EdgeTypeForm
          initial={edge.type}
          pending={edits.editEdge.isPending}
          error={edits.editEdge.error?.message ?? null}
          submitLabel="Zapisz"
          onSubmit={(type) =>
            // A new type means a new relationship, so the selection follows its new id.
            edits.editEdge.mutate({ id: edge.id, type }, { onSuccess: (next) => onReplaced(next.id) })
          }
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
          {edge.type}
        </span>
      )}
      <p className="text-sm font-semibold text-gray-900 wrap-break-word">{ends}</p>
      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              edits.editEdge.reset();
              setEditing(true);
            }}
          >
            Zmień typ
          </Button>
          <DeleteControl
            title="Usunąć powiązanie?"
            description={`„${ends}” (${edge.type}) zniknie z grafu. Tego nie da się cofnąć.`}
            mutation={edits.removeEdge}
            onDelete={() => edits.removeEdge.mutate(edge.id, { onSuccess: onClose })}
          />
        </div>
      )}
      <Sources spaceId={spaceId} focusId={edge.id} sources={sources} />
    </Panel>
  );
}

/** Confirms merging or linking the node picked on the canvas with the one it started from. */
export function PickPanel({
  kind,
  from,
  to,
  edits,
  onSwap,
  onDone,
  onCancel,
}: {
  kind: PickKind;
  from: { id: string; name: string };
  to: { id: string; name: string };
  edits: GraphEdits;
  onSwap: () => void;
  onDone: (selectId: string) => void;
  onCancel: () => void;
}) {
  return (
    <Panel title={kind === 'merge' ? 'Scalanie' : 'Nowe powiązanie'} onClose={onCancel}>
      <p className="text-sm text-gray-900 wrap-break-word">
        <span className="font-semibold">{from.name}</span>
        {kind === 'merge' ? ' zostanie włączony w ' : ' → '}
        <span className="font-semibold">{to.name}</span>
      </p>
      <Button variant="ghost" size="sm" className="px-0" onClick={onSwap}>
        ⇄ Zamień kierunek
      </Button>
      {kind === 'merge' ? (
        <>
          <p className="text-xs text-gray-500">
            Wzmianki, powiązania i aliasy przejdą do „{to.name}”, a „{from.name}” zostanie jego
            aliasem i zniknie z grafu.
          </p>
          {edits.merge.error && <ErrorNote>{edits.merge.error.message}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={edits.merge.isPending}
              onClick={() =>
                edits.merge.mutate(
                  { keepId: to.id, mergeId: from.id },
                  { onSuccess: () => onDone(to.id) },
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
          submitLabel="Dodaj"
          onSubmit={(type) =>
            edits.addEdge.mutate(
              { source: from.id, target: to.id, type },
              { onSuccess: () => onDone(from.id) },
            )
          }
          onCancel={onCancel}
        />
      )}
    </Panel>
  );
}

export function DetailsPanel({
  spaceId,
  node,
  isPending,
  edits,
  onToggleExpand,
  onStartPick,
  onClose,
}: DetailsPanelProps) {
  const hidden = Math.max(node.degree - node.visibleDegree, 0);
  const sources = useNodeSources(spaceId, node.id);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Panel title="Edycja węzła" onClose={() => setEditing(false)}>
        <NodeForm
          initial={{
            name: node.label,
            label: node.category,
            description: node.description,
            aliases: node.aliases,
          }}
          spaceId={spaceId}
          pending={edits.editNode.isPending}
          error={edits.editNode.error?.message ?? null}
          submitLabel="Zapisz"
          onSubmit={(fields) =>
            edits.editNode.mutate({ id: node.id, fields }, { onSuccess: () => setEditing(false) })
          }
          onCancel={() => setEditing(false)}
        />
      </Panel>
    );
  }

  return (
    <Panel title="Węzeł" onClose={onClose}>
      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
        {node.category}
      </span>
      <p className="text-sm font-semibold text-gray-900 wrap-break-word">{node.label}</p>
      {node.description && <p className="text-xs text-gray-600 line-clamp-4">{node.description}</p>}
      {node.aliases.length > 0 && (
        <p className="text-xs text-gray-500 wrap-break-word">Aliasy: {node.aliases.join(', ')}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
          <div className="font-semibold text-gray-900 text-sm">{node.degree}</div>
          <div>sąsiadów</div>
        </div>
        <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
          <div className="font-semibold text-gray-900 text-sm">{node.visibleDegree}</div>
          <div>widocznych</div>
        </div>
      </div>

      <button
        onClick={onToggleExpand}
        disabled={isPending}
        className="w-full mt-2 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {isPending ? 'Wczytuję...' : node.expanded ? 'Zwiń' : 'Rozwiń'}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            edits.editNode.reset();
            setEditing(true);
          }}
        >
          Edytuj
        </Button>
        <DeleteControl
          title="Usunąć węzeł?"
          description={`„${node.label}” zniknie z grafu razem ze swoimi powiązaniami. Tego nie da się cofnąć.`}
          mutation={edits.removeNode}
          onDelete={() => edits.removeNode.mutate(node.id, { onSuccess: onClose })}
        />
        <Button variant="secondary" size="sm" onClick={() => onStartPick('merge')}>
          Scal z…
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onStartPick('link')}>
          Powiąż z…
        </Button>
      </div>

      {hidden > 0 && (
        <p className="text-xs text-gray-500 text-center">
          {node.expanded ? `${hidden} powiązań poza limitem rozwinięcia` : `${hidden} ukrytych powiązań`}
        </p>
      )}

      <Sources spaceId={spaceId} focusId={node.id} sources={sources} />
    </Panel>
  );
}

function Sources({
  spaceId,
  focusId,
  sources,
}: {
  spaceId: string;
  focusId: string;
  sources: UseQueryResult<NodeSource[]>;
}) {
  // Kept after closing, so the drawer doesn't empty while it slides out.
  const [articleId, setArticleId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const show = (id: string) => {
    // A drawer can't appear over an element in native fullscreen.
    if (document.fullscreenElement) void document.exitFullscreen();
    setArticleId(id);
    setOpen(true);
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Źródła</span>
      {sources.isPending ? (
        <p className="mt-1 text-xs text-gray-500">Wczytuję…</p>
      ) : sources.isError ? (
        <p className="mt-1 text-xs text-red-600">{sources.error.message}</p>
      ) : sources.data.length === 0 ? (
        <p className="mt-1 text-xs text-gray-500">Brak artykułów</p>
      ) : (
        <ul className="mt-1 max-h-64 space-y-2 overflow-y-auto">
          {sources.data.map((s) => (
            <li key={s.article_id} className="rounded-lg bg-gray-50 px-2 py-1.5">
              <span className="block text-xs font-medium text-gray-900 wrap-break-word">
                {s.title || 'Bez tytułu'}
              </span>
              {s.quotes.length > 0 ? (
                s.quotes.map((q, i) => (
                  <q key={i} className="mt-1 block font-serif text-xs text-gray-600 line-clamp-3">
                    {q}
                  </q>
                ))
              ) : (
                <span className="mt-1 block text-xs text-gray-400">Bez wskazanego zdania</span>
              )}
              <button
                type="button"
                onClick={() => show(s.article_id)}
                className="mt-1.5 inline-block cursor-pointer text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                Pokaż w artykule →
              </button>
            </li>
          ))}
        </ul>
      )}
      <ArticlePreview
        spaceId={spaceId}
        articleId={articleId}
        focusId={focusId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
