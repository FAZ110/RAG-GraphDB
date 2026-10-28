import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import type { LabelCount } from '@/types/analysis'

/** The canvas's mix of entity types as one strip of inks, widest first. */
export function TypeStrip({ labels, total }: { labels: LabelCount[]; total: number }) {
  const rest = total - labels.reduce((sum, l) => sum + l.count, 0)
  return (
    <span className="flex h-1.5 w-full overflow-hidden bg-line-soft" aria-hidden="true">
      {labels.map((l) => (
        <span
          key={l.label}
          title={`${typeName(l.label)}: ${l.count}`}
          style={{ flexGrow: l.count, backgroundColor: inkFor(l.label).color }}
        />
      ))}
      {rest > 0 && <span style={{ flexGrow: rest }} className="bg-line" />}
    </span>
  )
}
