import { useEffect, useMemo } from "react";
import type { ArticleResult } from "../types";

interface ResultCarouselProps {
  results: ArticleResult[];
  total: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  emptyMessage?: string;
}

export function ResultCarousel({
  results,
  total,
  currentIndex,
  onIndexChange,
  emptyMessage,
}: ResultCarouselProps) {
  const count = results.length;
  const clampedIndex = count === 0 ? 0 : Math.min(currentIndex, count - 1);
  const current = count > 0 ? results[clampedIndex] : null;

  const idToName = useMemo(() => {
    if (!current?.nodes) return {} as Record<string, string>;
    return Object.fromEntries(current.nodes.map((n) => [n.id, n.properties.name as string]));
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (count === 0) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange(Math.max(0, clampedIndex - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange(Math.min(count - 1, clampedIndex + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, clampedIndex, onIndexChange]);

  if (count === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-gray-400">
        <p className="max-w-sm">{emptyMessage ?? 'Brak wyników do wyświetlenia.'}</p>
      </div>
    );
  }

  const goPrev = () => onIndexChange(Math.max(0, clampedIndex - 1));
  const goNext = () => onIndexChange(Math.min(count - 1, clampedIndex + 1));
  const isOk = current?.status === 'ok';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <button
          onClick={goPrev}
          disabled={clampedIndex === 0}
          aria-label="Poprzedni wynik"
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-gray-700">
            Artykuł {clampedIndex + 1} z {total > 0 ? total : count}
          </span>
          <span className="text-xs text-gray-500">
            {count} {count === 1 ? 'wynik' : count < 5 ? 'wyniki' : 'wyników'} dostępnych
          </span>
        </div>

        <button
          onClick={goNext}
          disabled={clampedIndex >= count - 1}
          aria-label="Następny wynik"
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 mb-4 flex-shrink-0 overflow-x-auto">
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onIndexChange(i)}
            aria-label={`Wynik ${i + 1}`}
            className={`h-1.5 flex-1 min-w-[12px] rounded-full transition-all cursor-pointer ${
              i === clampedIndex
                ? 'bg-blue-600'
                : r.status === 'ok'
                ? 'bg-green-300 hover:bg-green-400'
                : 'bg-red-300 hover:bg-red-400'
            }`}
          />
        ))}
      </div>

      <div
        className={`p-6 rounded-xl border ${
          isOk ? 'flex-1 min-h-0 overflow-y-auto bg-green-50 border-green-200' : 'flex-shrink-0 bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
              Wynik {clampedIndex + 1}
            </p>
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {current?.title ?? `Artykuł ${clampedIndex + 1}`}
            </h3>
          </div>
          <span
            className={`text-xs font-bold uppercase px-3 py-1 rounded-full flex-shrink-0 ${
              isOk ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
            }`}
          >
            {isOk ? 'OK' : 'Błąd'}
          </span>
        </div>

        {current?.error && (
          <p className="text-red-700 text-sm bg-red-100 px-3 py-2 rounded-lg mb-3">{current.error}</p>
        )}

        {isOk && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1 bg-white border border-green-200 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Węzły</p>
                <p className="text-2xl font-bold text-gray-900">{current?.nodes_count ?? 0}</p>
              </div>
              <div className="flex-1 bg-white border border-green-200 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Krawędzie</p>
                <p className="text-2xl font-bold text-gray-900">{current?.edges_count ?? 0}</p>
              </div>
            </div>

            {current?.nodes && current.nodes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Wyekstrahowane węzły</p>
                <div className="flex flex-wrap gap-2">
                  {current.nodes.map((n, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full"
                    >
                      <span className="font-semibold">{n.label}</span>: {n.properties.name as string}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {current?.edges && current.edges.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Relacje</p>
                <div className="flex flex-col gap-1.5">
                  {current.edges.map((e, i) => (
                    <span key={i} className="text-xs text-gray-700 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      {idToName[e.source] ?? e.source} —[{e.type}]→ {idToName[e.target] ?? e.target}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
