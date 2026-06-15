interface ExtractionControlsProps {
  status: 'idle' | 'running' | 'paused' | 'done' | 'error';
  processedCount: number;
  total: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
}

const PauseIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 005.6 6.6M4 15a8 8 0 0014.4 2.4" />
  </svg>
);

export function ExtractionControls({
  status,
  processedCount,
  total,
  onPause,
  onResume,
  onStop,
  onReset,
}: ExtractionControlsProps) {
  const isActive = status === 'running' || status === 'paused';
  const percent = total > 0 ? Math.round((processedCount / total) * 100) : 0;

  const statusMeta = (() => {
    switch (status) {
      case 'running':
        return { label: 'Przetwarzanie', dot: 'bg-blue-500 animate-pulse', text: 'text-blue-700', bar: 'bg-blue-500' };
      case 'paused':
        return { label: 'Wstrzymano', dot: 'bg-amber-500', text: 'text-amber-700', bar: 'bg-amber-500' };
      case 'done':
        return { label: 'Zakończono', dot: 'bg-green-500', text: 'text-green-700', bar: 'bg-green-500' };
      case 'error':
        return { label: 'Błąd', dot: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-500' };
      default:
        return { label: '', dot: 'bg-gray-400', text: 'text-gray-500', bar: 'bg-gray-400' };
    }
  })();

  if (status === 'idle') return null;

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
          <span className={`text-sm font-semibold ${statusMeta.text} truncate`}>{statusMeta.label}</span>
        </div>
        <span className="text-xs font-mono text-gray-500 tabular-nums">
          {processedCount} / {total}
        </span>
      </div>

      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${statusMeta.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {status === 'running' ? (
            <button
              onClick={onPause}
              title="Wstrzymaj"
              aria-label="Wstrzymaj"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            >
              <PauseIcon />
            </button>
          ) : (
            <button
              onClick={onResume}
              title="Wznów"
              aria-label="Wznów"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            >
              <PlayIcon />
            </button>
          )}
          <button
            onClick={onStop}
            title="Zatrzymaj"
            aria-label="Zatrzymaj"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
          >
            <StopIcon />
          </button>
          <div className="flex-1" />
        </div>
      )}

      {(status === 'done' || status === 'error') && (
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 mt-0.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshIcon />
          Nowa ekstrakcja
        </button>
      )}
    </div>
  );
}
