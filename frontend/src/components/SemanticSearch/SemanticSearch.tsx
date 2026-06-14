import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchSimilarNodes } from '../../services/api';
import type { SimilarNode } from '../../types';

interface Props {
  onResults: (names: string[]) => void;
  onFocus: (name: string | null) => void;
  focusedName: string | null;
}

const PAGE_SIZE = 20;
const MAX_RESULTS = 100;

export function SemanticSearch({ onResults, onFocus, focusedName }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SimilarNode[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  const [topK, setTopK] = useState(PAGE_SIZE);
  const focusedNameRef = useRef(focusedName);
  focusedNameRef.current = focusedName;

  const mutation = useMutation({
    mutationFn: ({ q, k }: { q: string; k: number }) => fetchSimilarNodes(q, k),
    onSuccess: (data: SimilarNode[]) => {
      setResults(data);
      onResults(data.map((d) => d.name));
      if (data.length === 0) {
        onFocus(null);
        return;
      }
      const current = focusedNameRef.current;
      if (!current || !data.some((d) => d.name === current)) {
        onFocus(data[0].name);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLastQuery(q);
    setTopK(PAGE_SIZE);
    mutation.mutate({ q, k: PAGE_SIZE });
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const handleLoadMore = () => {
    if (!lastQuery || mutation.isPending) return;
    const newK = Math.min(topK + PAGE_SIZE, MAX_RESULTS);
    if (newK === topK) return;
    setTopK(newK);
    mutation.mutate({ q: lastQuery, k: newK });
  };

  const handleReset = () => {
    setQuery('');
    setResults([]);
    setLastQuery('');
    setTopK(PAGE_SIZE);
    mutation.reset();
    onResults([]);
    onFocus(null);
  };

  const canLoadMore =
    results.length > 0 && results.length === topK && topK < MAX_RESULTS;

  const focusedIndex = focusedName
    ? results.findIndex((r) => r.name === focusedName)
    : -1;

  const resultsRef = useRef(results);
  const focusedIndexRef = useRef(focusedIndex);
  const listRef = useRef<HTMLUListElement>(null);
  resultsRef.current = results;
  focusedIndexRef.current = focusedIndex;

  useEffect(() => {
    if (!focusedName || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-name="${CSS.escape(focusedName)}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedName]);

  const goTo = (offset: number) => {
    const list = resultsRef.current;
    if (list.length === 0) return;
    const base = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0;
    const next = (base + offset + list.length) % list.length;
    onFocus(list[next].name);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const arrowKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (resultsRef.current.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const offset = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      goTo(offset);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full space-y-2 pt-3 border-t border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Wyszukaj w bazie..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mutation.isPending || !query.trim()}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Szukam...' : 'Szukaj'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Wyczyść
          </button>
        </div>
      </form>

      {mutation.isError && (
        <p className="text-sm text-red-500">Błąd: {(mutation.error as Error).message}</p>
      )}

      {results.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">
              {focusedIndex >= 0 ? `${focusedIndex + 1} / ${results.length}` : `${results.length} wyników`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={(e) => { goTo(-1); e.currentTarget.blur(); }}
                className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer"
                aria-label="Poprzedni"
              >
                ←
              </button>
              <button
                type="button"
                onClick={(e) => { goTo(1); e.currentTarget.blur(); }}
                className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100 cursor-pointer"
                aria-label="Następny"
              >
                →
              </button>
            </div>
          </div>
          <ul
            ref={listRef}
            className="flex-1 min-h-0 text-sm text-gray-700 divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-y-auto"
          >
            {results.map((node) => {
              const isFocused = node.name === focusedName;
              return (
                <li key={node.name} data-name={node.name}>
                  <button
                    type="button"
                    title={`score: ${node.score.toFixed(3)}`}
                    onClick={(e) => { onFocus(node.name); e.currentTarget.blur(); }}
                    className={`w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                      isFocused ? 'bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={isFocused ? 'font-semibold text-orange-700' : 'font-medium'}>
                      {node.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">({node.label})</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {canLoadMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={(e) => { handleLoadMore(); e.currentTarget.blur(); }}
                disabled={mutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Ładuję...' : `Załaduj więcej (${Math.min(PAGE_SIZE, MAX_RESULTS - topK)})`}
              </button>
            </div>
          )}
        </div>
      )}

      {mutation.data && results.length === 0 && (
        <p className="text-sm text-gray-500">Brak wyników.</p>
      )}
    </div>
  );
}
