import { Popover } from 'radix-ui'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Swatch, focusRing } from '@/components/deck'
import { SpaceSwitchList } from '@/components/nav/SpaceSwitchList'
import { rememberSpace } from '@/components/Spaces/choice/spaceChoice'
import { inkFor } from '@/design/inks'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { CARD_HEIGHT } from './cardSize'

interface Props {
  space: Space
  spaces: Space[]
}

/**
 * A sketch of the next card, drawn in dashes where the others are inked: the space it will be
 * in, which can be switched right here, a title still to be written and an empty strip of types.
 */
export function NewAnalysis({ space, spaces }: Props) {
  const [picking, setPicking] = useState(false)

  return (
    <div
      className={cn(
        'group deck-lift relative flex flex-col gap-3 border border-dashed border-fg-faint bg-surface/60 p-4 text-fg-subtle hover:bg-surface hover:text-fg',
        CARD_HEIGHT
      )}
    >
      {/* The whole card opens the editor; the space switch sits above it. */}
      <Link
        to={`/analyses/${space.id}/new`}
        aria-label={`Nowa analiza w przestrzeni ${space.name}`}
        className={cn('absolute inset-0', focusRing)}
      />
      <Popover.Root open={picking} onOpenChange={setPicking}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={`Przestrzeń ${space.name}. Zmień przestrzeń`}
            className={cn(
              'relative z-10 -m-1 flex max-w-full items-center gap-1.5 self-start p-1 text-xs text-fg-subtle hover:text-fg',
              focusRing
            )}
          >
            <Swatch color={inkFor(space.id).color} />
            <span className="truncate">{space.name}</span>
            <ChevronDownIcon className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="deck z-60 w-72 animate-in border border-fg bg-surface p-2 fade-in-0 zoom-in-95 spring-base [--deck-shadow:var(--fg-subtle)]"
          >
            <SpaceSwitchList
              spaces={spaces}
              currentId={space.id}
              onPick={(id) => {
                rememberSpace(id)
                setPicking(false)
              }}
              onNew={() => setPicking(false)}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span className="pointer-events-none flex items-center gap-2 text-heading">
        <PlusIcon className="size-5 shrink-0" aria-hidden="true" />
        Nowa analiza
      </span>
      <span className="pointer-events-none mt-auto flex flex-col gap-2">
        <span className="h-1.5 w-full border border-dashed border-line" aria-hidden="true" />
        <span className="text-xs">Od encji, artykułu albo pustego płótna</span>
      </span>
    </div>
  )
}
