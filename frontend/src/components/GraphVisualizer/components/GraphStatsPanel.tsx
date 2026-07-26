import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NodeResult, LoadedEdge } from '../../../types';
import { useGraphStats } from '../hooks/useGraphStats';
import { MetricsTiles } from './MetricsTiles';
import { BarSection } from './BarSection';
import {COLORS, DEFAULT_COLOR} from '../utils/constants'

interface GraphStatsPanelProps {
  nodes: NodeResult[];
  edges: LoadedEdge[];
  totalNodes: number;
  colorMap: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
}

export function GraphStatsPanel({ nodes, edges, totalNodes, colorMap, isOpen, onClose }: GraphStatsPanelProps) {
  const statsEdges = useMemo(
    () => edges.map((e) => ({ ...e, properties: {} as Record<string, unknown> })),
    [edges],
  );
  const stats = useGraphStats(nodes, statsEdges);

  return createPortal(
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
          <span className="text-sm font-semibold text-gray-900">Statystyki widocznego podgrafu</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            Statystyki dotyczą {nodes.length} wczytanych węzłów z {totalNodes} w bazie.
            Rozwiń kolejne węzły, aby je uzupełnić.
          </p>

          <MetricsTiles metrics={[
            { label: 'Węzły', value: stats.N },
            { label: 'Krawędzie', value: stats.E },
            { label: 'Gęstość', value: `${(stats.density * 100).toFixed(2)}%` },
            { label: 'Średni stopień', value: stats.avgDegree.toFixed(1) },
            { label: 'Maks. stopień', value: stats.maxDegree},
            { label: 'Komponenty', value: stats.connectedComponents.count },
            { label: 'Największy komponent', value: stats.largestComponent},
            { label: 'SCC', value: stats.sccs.count },
          ]} />

          {stats.isolated > 0 && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
              <span>{stats.isolated} izolowanych węzłów (bez krawędzi)</span>
            </div>
          )}

          {stats.categoryEntries.length > 0 && (
            <BarSection
              title="Kategorie węzłów"
              entries={stats.categoryEntries}
              colorFor={(label) => colorMap[label] ?? DEFAULT_COLOR}
            />
          )}

          {stats.edgeTypeEntries.length > 0 && (
            <BarSection
              title="Typy relacji"
              entries={stats.edgeTypeEntries}
              colorFor={(_, i) => COLORS[i % COLORS.length]}
            />
          )}

          {stats.topNodes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Najpopularniejsze węzły (wg stopnia)
              </p>
              <div className="space-y-1.5">
                {stats.topNodes.map((node, i) => (
                  <div key={`${node.name}-${i}`} className="flex items-center gap-2 text-xs">
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
    </>,
    document.body,
  );
}
