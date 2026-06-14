import { useState } from "react";

type Metric = { label: string; value: string | number };

export function MetricsTiles({ metrics }: { metrics: Metric[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 w-full text-left cursor-pointer hover:text-gray-700"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>Podsumowanie</span>
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-semibold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}