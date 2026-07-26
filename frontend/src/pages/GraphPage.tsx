import { useCallback, useEffect, useState } from "react";
import { GraphVisualizer } from "../components/GraphVisualizer/GraphVisualizer";
import { GraphStatsPanel } from "../components/GraphVisualizer/components/GraphStatsPanel";
import { useDeleteGraph } from "../hooks/useDeleteGraph";
import { SemanticSearch } from "../components/SemanticSearch/SemanticSearch";
import type { GraphSnapshot } from "../components/GraphVisualizer/GraphVisualizer";

const PANEL_HEIGHT = "h-[calc(100vh-7rem)]";

export function GraphPage() {
  const { mutate: deleteGraph, isPending: isDeleting } = useDeleteGraph();
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [visible, setVisible] = useState<GraphSnapshot>({
    nodes: [],
    edges: [],
    totalNodes: 0,
    colorMap: {},
  });
  const [reloadKey, setReloadKey] = useState(0);

  const handleGraphChange = useCallback((snapshot: GraphSnapshot) => {
    setVisible(snapshot);
  }, []);

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
              {`${visible.nodes.length} z ${visible.totalNodes} węzłów, ${visible.edges.length} krawędzi`}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (window.confirm('Na pewno? Graf zostanie nieodwracalnie usunięty.')) {
                    deleteGraph(undefined, { onSuccess: () => setReloadKey((k) => k + 1) });
                  }
                }}
                disabled={isDeleting}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isDeleting ? '...' : 'Wyczyść'}
              </button>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Odśwież
              </button>
              <button
                onClick={() => setIsStatsOpen(true)}
                className="flex-1 px-2 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Statystyki
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 mt-3">
            <SemanticSearch
              onResults={setHighlightedIds}
              onFocus={setFocusedId}
              focusedId={focusedId}
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full">
        <div className={`bg-white p-5 shadow-xl rounded-2xl border border-gray-100 ${PANEL_HEIGHT} flex flex-col`}>
          <div className="flex-1 min-h-0">
            <GraphVisualizer
              key={reloadKey}
              highlightedIds={highlightedIds}
              focusedId={focusedId}
              onGraphChange={handleGraphChange}
            />
          </div>
        </div>
      </main>

      <GraphStatsPanel
        nodes={visible.nodes}
        edges={visible.edges}
        totalNodes={visible.totalNodes}
        colorMap={visible.colorMap}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
      />
    </div>
  );
}
