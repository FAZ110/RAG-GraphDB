
interface BarSectionProps {
  title: string;
  entries: [string, number][];
  colors: string[];
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


export function BarSection({ title, entries, colors }: BarSectionProps) {
  const max = entries[0]?.[1] ?? 1;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</p>
      <div className="space-y-2">
        {entries.slice(0, 8).map(([label, count], i) => (
          <BarRow key={label} label={label} count={count} max={max} color={colors[i % colors.length]} />
        ))}
      </div>
    </div>
  );
}
