import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { GraphVisualizer } from "../components/GraphVisualizer/GraphVisualizer";
import { GraphStatsPanel } from "../components/GraphVisualizer/components/GraphStatsPanel";
import { SemanticSearch } from "../components/SemanticSearch/SemanticSearch";
import { SpaceSelect } from "../components/Spaces/choice/SpaceSelect";
import { pickSpace, rememberSpace } from "../components/Spaces/choice/spaceChoice";
import { useClearSpace, useSpaces } from "../hooks/useSpaces";
import type { GraphSnapshot } from "../components/GraphVisualizer/GraphVisualizer";
import type { Space } from "../types";

const PANEL_HEIGHT = "h-[calc(100vh-7rem)]";

export function GraphPage() {
  const { spaceId } = useParams();
  const spaces = useSpaces();
  const space = spaces.data && pickSpace(spaces.data, spaceId ?? null);

  useEffect(() => {
    if (space) rememberSpace(space.id);
  }, [space]);

  if (spaces.error) {
    return <p className="text-sm text-red-700">{spaces.error.message}</p>;
  }
  if (!spaces.data) return null;
  if (!space) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-lg font-semibold text-gray-900">Nie masz jeszcze żadnej przestrzeni</p>
        <p className="text-sm text-gray-600">
          Graf powstaje z artykułów dodanych do przestrzeni.{" "}
          <Link to="/spaces" className="font-semibold text-blue-700 hover:underline">
            Utwórz przestrzeń
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Shown while the address catches up, so the page isn't torn down and rebuilt. */}
      {space.id !== spaceId && <Navigate to={`/graph/${space.id}`} replace />}
      {/* Keyed, so search results and the explored graph don't carry over between spaces. */}
      <SpaceGraph key={space.id} space={space} spaces={spaces.data} />
    </>
  );
}

function SpaceGraph({ space, spaces }: { space: Space; spaces: Space[] }) {
  const navigate = useNavigate();
  // Coming from the space's "Nowa analiza", the user wants to search right away.
  const exploring = (useLocation().state as { explore?: boolean } | null)?.explore === true;
  const { mutate: clearSpace, isPending: isDeleting } = useClearSpace(space.id);
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
                Encje i powiązania wyekstrahowane z artykułów przestrzeni
              </p>
            </div>

            <SpaceSelect
              spaces={spaces}
              value={space.id}
              onChange={(id) => navigate(`/graph/${id}`)}
              className="w-full"
            />

            <div className="text-sm text-gray-500">
              {`${visible.nodes.length} z ${visible.totalNodes} węzłów, ${visible.edges.length} krawędzi`}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Usunąć wszystkie artykuły i graf przestrzeni „${space.name}”? Tego nie da się cofnąć.`,
                    )
                  ) {
                    clearSpace(undefined, { onSuccess: () => setReloadKey((k) => k + 1) });
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
              spaceId={space.id}
              autoFocus={exploring}
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
              spaceId={space.id}
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
