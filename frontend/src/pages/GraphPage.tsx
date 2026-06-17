import { useEffect, useState } from "react";
import { useGraphQuery } from "../hooks/useGraphQuery";
import { GraphVisualizer } from "../components/GraphVisualizer/GraphVisualizer";
import { GraphStatsPanel } from "../components/GraphVisualizer/components/GraphStatsPanel";
import { useDeleteGraph } from "../hooks/useDeleteGraph";
import { SemanticSearch } from "../components/SemanticSearch/SemanticSearch";

const PANEL_HEIGHT = "h-[calc(100vh-7rem)]";

export function GraphPage() {
  const { data, isLoading, isError, error, refetch } = useGraphQuery();
  const { mutate: deleteGraph, isPending: isDeleting } = useDeleteGraph();
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      setFocusedId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
      <aside className="w-full lg:w-96 lg:shrink-0">
        <div className={`bg-white p-5 shadow-xl rounded-2xl border border-gray-100 flex flex-col ${PANEL_HEIGHT}`}>
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Graf wiedzy
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Encje i powiązania wyekstrahowane z artykułów
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {data && `${data.nodes.length} węzłów, ${data.edges.length} krawędzi`}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (window.confirm('Na pewno? Graf zostanie nieodwracalnie usunięty.')) deleteGraph();
                }}
                disabled={isDeleting}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isDeleting ? '...' : 'Wyczyść'}
              </button>
              <button
                onClick={() => refetch()}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Odśwież
              </button>
              <button
                onClick={() => setIsStatsOpen(true)}
                disabled={!data}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Statystyki
              </button>
            </div>
          </div>

          {data && (
            <div className="flex-1 min-h-0 mt-3">
              <SemanticSearch
                onResults={setHighlightedIds}
                onFocus={setFocusedId}
                focusedId={focusedId}
              />
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full">
        <div className={`bg-white p-5 shadow-xl rounded-2xl border border-gray-100 ${PANEL_HEIGHT} flex flex-col`}>
          {isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Ładowanie grafu...</p>
            </div>
          )}

          {isError && (
            <p className="text-center text-red-500 py-16">{error.message}</p>
          )}

          {data && (
            <div className="flex-1 min-h-0">
              <GraphVisualizer
                nodes={data.nodes}
                edges={data.edges}
                highlightedIds={highlightedIds}
                focusedId={focusedId}
              />
            </div>
          )}
        </div>
      </main>

      {data && (
        <GraphStatsPanel
          nodes={data.nodes}
          edges={data.edges}
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
        />
      )}
    </div>
  );
}
