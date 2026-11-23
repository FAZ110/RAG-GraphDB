import { EyeIcon, EyeOffIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton, Swatch, focusRing } from '@/components/deck'
import { ENTITY_FORMS, pluralForm, typeName } from '@/components/Spaces/spaceText'
import { FloatingPanel } from '@/components/workspace/FloatingPanel'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { LoadedNode } from '@/types'
import type { LabelCount } from '@/types/analysis'
import type { Insights } from '../insights'
import { groupInk } from '../useAnalysisEditor'
import type { Lens } from '../useAnalysisEditor'

const LENSES: { lens: Lens; name: string; hint?: string; none?: string }[] = [
  { lens: 'types', name: 'Typy' },
  {
    lens: 'groups',
    name: 'Grupy',
    hint: 'Kolor: encje powiązane gęściej ze sobą niż z resztą.',
    none: 'Analiza nie dzieli się na grupy.',
  },
  {
    lens: 'brokers',
    name: 'Pośrednicy',
    hint: 'Wielkość: ile najkrótszych połączeń biegnie przez encję.',
    none: 'Nic tu nie łączy się przez inną encję.',
  },
  {
    lens: 'critical',
    name: 'Krytyczne',
    hint: 'Obwódka: bez tej encji część analizy traci połączenie z resztą.',
    none: 'Żadna encja nie rozcina analizy.',
  },
]

const MIN_SHARE = 0.05

interface Props {
  types: LabelCount[]
  total: number
  hidden: ReadonlySet<string>
  onToggle: (label: string) => void
  onSelectType: (label: string) => void
  /** What the shape of the canvas says, for a canvas that offers it; the map shows types only. */
  shape?: {
    lens: Lens
    onLens: (lens: Lens) => void
    found: Insights | null
    nodeOf: (id: string) => LoadedNode | undefined
    onPick: (ids: string[]) => void
    onHover: (ids: string[] | null) => void
  }
}

function Row({
  swatch,
  name,
  note,
  muted,
  onClick,
  onHover,
  title,
  children,
}: {
  swatch: string
  name: string
  note: ReactNode
  muted?: boolean
  onClick: () => void
  onHover?: (on: boolean) => void
  title?: string
  children?: ReactNode
}) {
  return (
    <li className="group flex items-center gap-1 pr-1">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHover?.(true)}
        onFocus={() => onHover?.(true)}
        onBlur={() => onHover?.(false)}
        title={title}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 text-left text-sm hover:bg-surface-sunken',
          muted ? 'text-fg-faint' : 'text-fg-soft',
          !children && 'pr-2',
          focusRing
        )}
      >
        <Swatch color={swatch} className="rounded-full" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-xs text-fg-subtle tabular-nums">{note}</span>
      </button>
      {children}
    </li>
  )
}

// Brokers through which almost nothing runs only crowd the list.
function shapeRows({ lens, found, nodeOf, onPick, onHover }: NonNullable<Props['shape']>) {
  const hover = (ids: string[]) => (on: boolean) => onHover(on ? ids : null)
  const inkOf = (id: string) => inkFor(nodeOf(id)?.label ?? '').color
  if (lens === 'groups')
    return (found?.groups ?? []).map((g, i) => (
      <Row
        key={g.hub}
        swatch={groupInk(i)}
        name={nodeOf(g.hub)?.name ?? ''}
        note={g.ids.length}
        title="Zaznacz grupę"
        onClick={() => onPick(g.ids)}
        onHover={hover(g.ids)}
      />
    ))
  if (lens === 'brokers')
    return (found?.brokers ?? [])
      .filter((b) => b.score >= MIN_SHARE)
      .map((b) => (
        <Row
          key={b.id}
          swatch={inkOf(b.id)}
          name={nodeOf(b.id)?.name ?? ''}
          note={`${Math.round(b.score * 100)}%`}
          onClick={() => onPick([b.id])}
          onHover={hover([b.id])}
        />
      ))
  return (found?.critical ?? []).map((c) => (
    <Row
      key={c.id}
      swatch={inkOf(c.id)}
      name={nodeOf(c.id)?.name ?? ''}
      note={`odcina ${c.score}`}
      title="Wskaż, by zobaczyć, co odcina"
      onClick={() => onPick([c.id])}
      onHover={hover([c.id, ...c.cut])}
    />
  ))
}

/** What the canvas shows its entities by, and the key to it: their types, or its shape. */
export function LayersPanel(props: Props) {
  const { shape } = props
  const lens = shape?.lens ?? 'types'
  const { hint, none } = LENSES.find((l) => l.lens === lens)!
  const rows = shape ? shapeRows(shape) : []
  return (
    <FloatingPanel
      title="Legenda"
      aside={
        <span className="text-xs text-fg-subtle tabular-nums">
          {props.total} {pluralForm(props.total, ENTITY_FORMS)}
        </span>
      }
    >
      {shape && (
        <div role="tablist" aria-label="Pokaż encje według" className="flex gap-0.5 px-2 pt-2">
          {LENSES.map((l) => (
            <button
              key={l.lens}
              type="button"
              role="tab"
              aria-selected={lens === l.lens}
              onClick={() => shape.onLens(l.lens)}
              className={cn(
                'h-7 min-w-0 flex-1 px-1 text-[11px] font-medium whitespace-nowrap transition-colors',
                lens === l.lens
                  ? 'bg-fg text-fg-inverse'
                  : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                focusRing
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
      {lens === 'types' ? (
        <ul className="py-1">
          {props.types.map(({ label, count }) => {
            const off = props.hidden.has(label)
            return (
              <Row
                key={label}
                swatch={off ? 'var(--line)' : inkFor(label).color}
                name={typeName(label)}
                note={count}
                muted={off}
                title={`Zaznacz: ${typeName(label)}`}
                onClick={() => props.onSelectType(label)}
              >
                <IconButton
                  variant="ghost"
                  size="icon-sm"
                  label={off ? `Pokaż: ${typeName(label)}` : `Ukryj: ${typeName(label)}`}
                  onClick={() => props.onToggle(label)}
                  className={cn(
                    'size-7',
                    !off && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                  )}
                >
                  {off ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>
              </Row>
            )
          })}
        </ul>
      ) : (
        <>
          <p className="px-3 pt-2 text-xs text-fg-subtle">{rows.length ? hint : none}</p>
          <ul className="py-1" onMouseLeave={() => shape?.onHover(null)}>
            {rows}
          </ul>
        </>
      )}
    </FloatingPanel>
  )
}
