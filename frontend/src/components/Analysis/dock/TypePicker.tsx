import { Popover } from 'radix-ui'
import { ShapesIcon } from 'lucide-react'
import { IconButton, Kbd, Swatch, Tooltip, focusRing } from '@/components/deck'
import { typeName } from '@/components/Spaces/spaceText'
import { inkFor } from '@/design/inks'
import { useSpaceStats } from '@/hooks/useSpaces'
import { cn } from '@/lib/utils'

interface Props {
  spaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (label: string) => void
}

/** Every type of the space with its count; picking one proposes all its entities. */
export function TypePicker({ spaceId, open, onOpenChange, onPick }: Props) {
  const stats = useSpaceStats(spaceId)
  const types = stats.data?.entities.by_label ?? []

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip
        content={
          <span className="flex items-center gap-2">
            <span className="font-semibold">Wszystkie danego typu</span>
            <Kbd tone="inverse">T</Kbd>
          </span>
        }
      >
        <Popover.Trigger asChild>
          <IconButton label="Wszystkie danego typu" title="" variant="ghost" size="icon-md">
            <ShapesIcon />
          </IconButton>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          // Focus going back to the trigger would reopen its tooltip over the proposal.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="deck z-50 max-h-80 w-64 animate-in overflow-y-auto border border-line bg-surface py-1 fade-in-0 zoom-in-95 spring-base"
        >
          <p className="px-3 pt-1.5 pb-1 text-xs font-semibold text-fg-subtle">Dodaj wszystkie</p>
          {stats.isPending && <p className="px-3 py-2 text-sm text-fg-subtle">Wczytuję typy…</p>}
          {types.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                onOpenChange(false)
                onPick(t.label)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg-soft hover:bg-surface-sunken',
                focusRing
              )}
            >
              <Swatch color={inkFor(t.label).color} className="rounded-full" />
              <span className="min-w-0 flex-1 truncate">{typeName(t.label)}</span>
              <span className="text-xs text-fg-subtle tabular-nums">{t.count}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
