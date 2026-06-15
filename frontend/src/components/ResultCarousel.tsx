import { useEffect, useMemo } from "react";
import type { ArticleResult } from "../types";

interface ResultCarouselProps {
  results: ArticleResult[];
  total: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  emptyMessage?: string;
}

const LABEL_PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
  { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
];

function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  return LABEL_PALETTE[Math.abs(hash) % LABEL_PALETTE.length];
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

  const nodeMeta = useMemo(() => {
    if (!current?.nodes) return {} as Record<string, { name: string; label: string }>;
    return Object.fromEntries(
      current.nodes.map((n) => [n.id, { name: n.properties.name as string, label: n.label }]),
    );
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
            <div className="grid grid-cols-2 gap-3">
              <div className="relative bg-white border border-green-200 rounded-xl p-3.5 overflow-hidden">
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-green-400 rounded-r" />
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Węzły</p>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="6" r="2.2" />
                    <circle cx="5" cy="18" r="2.2" />
                    <circle cx="19" cy="18" r="2.2" />
                    <path strokeLinecap="round" d="M11 7.5L6 16.5M13 7.5l5 9M7 18h10" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{current?.nodes_count ?? 0}</p>
              </div>
              <div className="relative bg-white border border-green-200 rounded-xl p-3.5 overflow-hidden">
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-400 rounded-r" />
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Krawędzie</p>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M14 7l5 5-5 5" />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{current?.edges_count ?? 0}</p>
              </div>
            </div>

            {current?.nodes && current.nodes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Wyekstrahowane węzły
                  </p>
                  <span className="text-[10px] font-mono text-gray-400">{current.nodes.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {current.nodes.map((n, i) => {
                    const c = colorForLabel(n.label);
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${c.bg} ${c.text} ${c.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        <span className="font-semibold tracking-wide text-[10px] uppercase opacity-70">
                          {n.label}
                        </span>
                        <span className="font-medium">{n.properties.name as string}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {current?.edges && current.edges.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Relacje</p>
                  <span className="text-[10px] font-mono text-gray-400">{current.edges.length}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {current.edges.map((e, i) => {
                    const src = nodeMeta[e.source];
                    const tgt = nodeMeta[e.target];
                    const sc = src ? colorForLabel(src.label) : LABEL_PALETTE[0];
                    const tc = tgt ? colorForLabel(tgt.label) : LABEL_PALETTE[0];
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center bg-white border border-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded truncate flex-shrink-0 max-w-full ${sc.bg} ${sc.text}`}
                            title={src?.name ?? e.source}
                          >
                            {src?.name ?? e.source}
                          </span>
                          <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-gray-300" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                          {e.type}
                        </span>
                        <div className="flex items-center gap-2 min-w-0 pl-2">
                          <span className="h-px flex-1 bg-gradient-to-r from-gray-300 to-gray-200" />
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded truncate flex-shrink-0 max-w-full ${tc.bg} ${tc.text}`}
                            title={tgt?.name ?? e.target}
                          >
                            {tgt?.name ?? e.target}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
