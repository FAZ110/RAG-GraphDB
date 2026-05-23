import type { NodeResult, EdgeResult } from '../../../types';
import { computeStats } from '../utils/graphStats';

interface GraphStatsPanelProps {
  nodes: NodeResult[];
  edges: EdgeResult[];
  isOpen: boolean;
  onClose: () => void;
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-700">
        <span className="truncate max-w-35">{label}</span>
        <span className="font-medium text-gray-900 ml-2">{count}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function GraphStatsPanel({ nodes, edges, isOpen, onClose }: GraphStatsPanelProps) {
  const stats = computeStats(nodes, edges);

  const categoryEntries = Object.entries(stats.categoryCount).sort((a, b) => b[1] - a[1]);
  const edgeTypeEntries = Object.entries(stats.edgeTypeCount).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = categoryEntries[0]?.[1] ?? 1;
  const maxEdgeTypeCount = edgeTypeEntries[0]?.[1] ?? 1;

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Graph Statistics</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Nodes', value: stats.N },
              { label: 'Edges', value: stats.E },
              { label: 'Density', value: `${(stats.density * 100).toFixed(2)}%` },
              { label: 'Avg degree', value: stats.avgDegree.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <div className="text-base font-semibold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {stats.isolated > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
              <span>{stats.isolated} isolated nodes (without edges)</span>
            </div>
          )}

          {categoryEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Nodes categories
              </p>
              <div className="space-y-2">
                {categoryEntries.slice(0, 8).map(([label, count], i) => (
                  <BarRow
                    key={label}
                    label={label}
                    count={count}
                    max={maxCategoryCount}
                    color={COLORS[i % COLORS.length]}
                  />
                ))}
              </div>
            </div>
          )}

          {edgeTypeEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Relationship types
              </p>
              <div className="space-y-2">
                {edgeTypeEntries.slice(0, 8).map(([label, count], i) => (
                  <BarRow
                    key={label}
                    label={label}
                    count={count}
                    max={maxEdgeTypeCount}
                    color={COLORS[i % COLORS.length]}
                  />
                ))}
              </div>
            </div>
          )}

          {stats.topNodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Top nodes (by degree)
              </p>
              <div className="space-y-1.5">
                {stats.topNodes.map((node, i) => (
                  <div key={node.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-gray-400 text-right shrink-0">{i + 1}.</span>
                    <span className="truncate flex-1 text-gray-800">{node.name}</span>
                    <span className="shrink-0 text-gray-500">
                      <span className="text-blue-600">↓{node.in}</span>
                      {' '}
                      <span className="text-orange-500">↑{node.out}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}