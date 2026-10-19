import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { fetchFailedArticles } from '../services/api';

interface FailedArticlesProps {
  spaceId: string;
  refreshKey?: unknown;
  onRetry: (articleIds: string[]) => void;
  disabled?: boolean;
}

const HIDDEN_CLIP = 'inset(100% 0% 0% 0% round 16px)';
const SHOWN_CLIP = 'inset(0% 0% 0% 0% round 16px)';

const ChevronUp = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

export function FailedArticles({ spaceId, refreshKey, onRetry, disabled = false }: FailedArticlesProps) {
  const query = useQuery({
    queryKey: ['failed-articles', spaceId],
    queryFn: () => fetchFailedArticles(spaceId),
  });
  const { refetch } = query;
  const articles = query.data ?? [];
  const error = query.error?.message ?? null;
  const [open, setOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const expanded = open && articles.length > 0;

  useEffect(() => {
    if (refreshKey !== undefined) refetch();
  }, [refreshKey, refetch]);

  const retryAll = () => {
    setOpen(false);
    onRetry(articles.map((a) => a.id));
  };

  const retryOne = (id: string) => {
    setRetryingId(id);
    onRetry([id]);
  };

  if (articles.length === 0 && !error) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={articles.length === 0}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 border border-red-200 bg-red-50/60 hover:bg-red-50 rounded-xl px-3 py-2 cursor-pointer disabled:cursor-default"
      >
        <span className="text-sm font-bold text-red-800 shrink-0">Nieudane artykuły ({articles.length})</span>
        {error ? (
          <span className="text-xs text-red-700 truncate">{error}</span>
        ) : (
          <span className="text-red-700">
            <ChevronUp />
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="failed-panel"
            initial={{ clipPath: HIDDEN_CLIP }}
            animate={{ clipPath: SHOWN_CLIP }}
            exit={{ clipPath: HIDDEN_CLIP }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-20 bg-white rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              <h3 className="text-xl font-extrabold text-red-800 tracking-tight">
                Nieudane artykuły ({articles.length})
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zwiń listę nieudanych artykułów"
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer rotate-180"
              >
                <ChevronUp />
              </button>
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
              {articles.map((a) => (
                <li key={a.id} className="flex items-center gap-2 bg-red-50/60 rounded-lg px-2.5 py-1.5 border border-red-100">
                  <p className="min-w-0 flex-1 text-xs font-semibold text-gray-800 truncate" title={a.error ?? undefined}>
                    {a.title || 'Bez tytułu'}
                  </p>
                  <button
                    type="button"
                    onClick={() => retryOne(a.id)}
                    disabled={disabled}
                    className="text-xs font-semibold px-2 py-1 rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    {disabled && retryingId === a.id ? 'Ponawianie…' : 'Ponów'}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={retryAll}
              disabled={disabled}
              className="mt-3 shrink-0 text-sm font-semibold px-3 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Ponów wszystkie
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
