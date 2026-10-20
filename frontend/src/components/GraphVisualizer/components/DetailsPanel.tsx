import { useState } from 'react';
import { useNodeSources } from '../../../hooks/useSpaces';
import { ArticlePreview } from '../../Spaces/preview/ArticlePreview';

export interface SelectedNode {
  id: string;
  label: string;
  category: string;
  degree: number;
  visibleDegree: number;
  expanded: boolean;
}

interface DetailsPanelProps {
  spaceId: string;
  node: SelectedNode;
  isPending: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function DetailsPanel({ spaceId, node, isPending, onToggleExpand, onClose }: DetailsPanelProps) {
  const hidden = Math.max(node.degree - node.visibleDegree, 0);

  return (
    <div className="absolute top-2 right-2 z-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Węzeł</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
          {node.category}
        </span>
        <p className="text-sm font-semibold text-gray-900 wrap-break-word">{node.label}</p>

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

        {hidden > 0 && (
          <p className="text-xs text-gray-500 text-center">
            {node.expanded
              ? `${hidden} powiązań poza limitem rozwinięcia`
              : `${hidden} ukrytych powiązań`}
          </p>
        )}

        <NodeSources spaceId={spaceId} nodeId={node.id} />
      </div>
    </div>
  );
}

function NodeSources({ spaceId, nodeId }: { spaceId: string; nodeId: string }) {
  const sources = useNodeSources(spaceId, nodeId);
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
        focusId={nodeId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
