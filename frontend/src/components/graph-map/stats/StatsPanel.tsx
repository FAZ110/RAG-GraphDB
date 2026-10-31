import { XIcon } from 'lucide-react'
import { useMemo } from 'react'
import { IconButton } from '@/components/deck'
import { Section } from '@/components/Analysis/panels/Section'
import { relationName } from '@/components/canvas/relationName'
import { typeName } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import type { OverviewResponse } from '@/types'
import { computeStats } from './graphStats'

const SHOWN = 8

interface Props {
  data: OverviewResponse
  onShow: (id: string) => void
  onClose: () => void
}

function Bars({
  entries,
  label,
  color,
}: {
  entries: [string, number][]
  label: (key: string) => string
  color: (key: string) => string
}) {
  const max = entries[0]?.[1] ?? 1
  return (
    <ul className="space-y-2 px-3 pb-3">
      {entries.slice(0, SHOWN).map(([key, count]) => (
        <li key={key} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="truncate text-fg-soft">{label(key)}</span>
            <span className="text-fg-subtle tabular-nums">{count}</span>
          </div>
          <div className="h-1.5 bg-surface-sunken">
            <div
              className="h-full"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: color(key) }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function StatsPanel({ data, onShow, onClose }: Props) {
  const stats = useMemo(() => computeStats(data.nodes, data.edges), [data])
  const sorted = (counts: Record<string, number>) =>
    Object.entries(counts).toSorted((a, b) => b[1] - a[1])

  const tiles: [string, string | number][] = [
    ['Encje', stats.N],
    ['Powiązania', stats.E],
    ['Gęstość', `${(stats.density * 100).toFixed(2)}%`],
    ['Średni stopień', stats.avgDegree.toFixed(1)],
    ['Maks. stopień', stats.maxDegree],
    ['Składowe spójne', stats.connectedComponents.count],
    ['Największa składowa', stats.largestComponent],
    ['Silnie spójne składowe', stats.sccs.count],
  ]

  return (
    <FloatingPanel
      title="Statystyki grafu"
      aside={
        <IconButton variant="ghost" size="icon-sm" label="Zamknij statystyki" onClick={onClose}>
          <XIcon />
        </IconButton>
      }
    >
      <dl className="grid grid-cols-2 gap-px border-b border-line-soft bg-line-soft">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-surface px-3 py-2">
            <dd className="text-sm font-semibold text-fg tabular-nums">{value}</dd>
            <dt className="text-xs text-fg-subtle">{label}</dt>
          </div>
        ))}
      </dl>
      {stats.isolated > 0 && (
        <p className="border-b border-line-soft px-3 py-2 text-xs text-fg-muted">
          {stats.isolated} encji bez żadnego powiązania
        </p>
      )}
      <Section title="Typy encji">
        <Bars
          entries={sorted(stats.categoryCount)}
          label={typeName}
          color={(label) => inkFor(label).color}
        />
      </Section>
      <Section title="Typy relacji">
        <Bars
          entries={sorted(stats.edgeTypeCount)}
          label={relationName}
          color={() => 'var(--fg-subtle)'}
        />
      </Section>
      <Section title="Najlepiej połączone">
        <ol className="pb-2">
          {stats.topNodes.map((node, i) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onShow(node.id)}
                className="flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-surface-sunken"
              >
                <span className="w-4 shrink-0 text-right text-fg-faint tabular-nums">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate text-fg-soft">{node.name}</span>
                <span
                  className="shrink-0 text-fg-subtle tabular-nums"
                  title="przychodzące / wychodzące"
                >
                  ↓{node.in} ↑{node.out}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Section>
    </FloatingPanel>
  )
}
