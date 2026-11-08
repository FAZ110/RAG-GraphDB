import { XIcon } from 'lucide-react'
import { Button, IconButton, Kbd, Swatch, focusRing } from '@/components/deck'
import { relationName } from '@/components/canvas/relationName'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import { PAGE, candidates } from '../proposal/proposal'
import type { ProposalView } from '../proposal/proposal'

interface Props {
  view: ProposalView | null
  looking: string | null
  error: string | null
  onGroup: (key: string | null) => void
  /** A group pointed at, to light its ghosts on the canvas. */
  onHoverGroup: (key: string | null) => void
  onMore: () => void
  onAcceptAll: () => void
  onDismiss: () => void
}

function Chip({
  on,
  onClick,
  onHover,
  children,
}: {
  on: boolean
  onClick: () => void
  onHover?: (on: boolean) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
        on
          ? 'bg-fg text-fg-inverse'
          : 'bg-surface-sunken text-fg-muted hover:bg-line-soft hover:text-fg',
        focusRing
      )}
    >
      {children}
    </button>
  )
}

/** What the ghosts on the canvas are, and how to take them or narrow them down. */
export function ProposalBar({
  view,
  looking,
  error,
  onGroup,
  onHoverGroup,
  onMore,
  onAcceptAll,
  onDismiss,
}: Props) {
  const close = (
    <IconButton variant="ghost" size="icon-sm" label="Odrzuć podgląd (Esc)" onClick={onDismiss}>
      <XIcon />
    </IconButton>
  )
  if (looking) {
    return (
      <div className="flex h-10 items-center gap-2 px-3 text-sm text-fg-subtle">
        <span className="size-1.5 animate-pulse rounded-full bg-fg-subtle" />
        <span className="min-w-0 flex-1 truncate">Szukam: {looking}…</span>
        {close}
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-10 items-center gap-2 px-3 text-sm text-danger">
        <span className="min-w-0 flex-1 truncate">{error}</span>
        {close}
      </div>
    )
  }
  if (!view) return null

  const { proposal, group, shown } = view
  const all = candidates(view)
  const rest = all.length - shown
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold text-fg">{proposal.title}</span>
          <span className="text-fg-subtle">
            {' '}
            · {all.length ? `${all.length} do dodania` : proposal.empty}
          </span>
        </p>
        {rest > 0 && (
          <Button size="sm" variant="ghost" onClick={onMore}>
            +{Math.min(rest, PAGE)}
          </Button>
        )}
        {all.length > 0 && (
          <Button size="sm" variant="primary" onClick={onAcceptAll}>
            Dodaj {all.length === 1 ? '' : `wszystkie ${all.length}`}
            <Kbd>↵</Kbd>
          </Button>
        )}
        {close}
      </div>
      {proposal.groups && proposal.groups.length > 1 && (
        <div
          className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]"
          onMouseLeave={() => onHoverGroup(null)}
        >
          <Chip on={group === null} onClick={() => onGroup(null)}>
            Wszystkie
          </Chip>
          {proposal.groups.map((g) => {
            const kind = (
              <span className="inline-flex items-center gap-1">
                <Swatch color={inkFor(g.label).color} className="size-2 rounded-full" />
                {typeName(g.label)}
              </span>
            )
            const relation = <span className="opacity-70">{relationName(g.type)}</span>
            return (
              <Chip
                key={g.key}
                on={group === g.key}
                onClick={() => onGroup(group === g.key ? null : g.key)}
                onHover={(on) => onHoverGroup(on ? g.key : null)}
              >
                {/* Read as a sentence about the expanded entity: "Zawodnik gra w" it,
                    or it "wygrał w Klub". */}
                {g.incoming ? (
                  <>
                    {kind} {relation}
                  </>
                ) : (
                  <>
                    {relation} {kind}
                  </>
                )}
                <span className="tabular-nums opacity-60">{g.count}</span>
              </Chip>
            )
          })}
        </div>
      )}
    </div>
  )
}
