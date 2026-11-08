import { useState } from 'react'
import { Popover } from 'radix-ui'
import { useLocation, useNavigate } from 'react-router-dom'
import { focusRing } from '@/components/deck'
import { rememberSpace } from '@/components/Spaces/choice/spaceChoice'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { Flyout } from './Flyout'
import { SpaceMark } from './SpaceMark'
import { SpaceSwitchList } from './SpaceSwitchList'

interface Props {
  space: Space
  spaces: Space[]
  side: 'right' | 'bottom'
  onPicked?: () => void
  /** Inside a dialog the list must stay in it, or the dialog's focus trap closes it. */
  inline?: boolean
}

// Switches space without leaving the page: pages about one space follow to the new one,
// others only remember it.
export function SpaceTile({ space, spaces, side, onPicked, inline = false }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const done = () => {
    setOpen(false)
    onPicked?.()
  }
  const pick = (id: string) => {
    done()
    const section = pathname.match(/^\/(spaces|graph)(?:\/|$)/)?.[1]
    if (section) navigate(`/${section}/${id}`)
    else rememberSpace(id)
  }

  const list = (
    <Popover.Content
      side={side}
      align="start"
      sideOffset={side === 'right' ? 20 : 8}
      collisionPadding={12}
      className="deck z-60 w-72 border border-fg bg-surface p-2 [--deck-shadow:var(--fg-subtle)]"
    >
      <SpaceSwitchList spaces={spaces} currentId={space.id} onPick={pick} onNew={done} />
    </Popover.Content>
  )

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Przestrzeń ${space.name}. Zmień przestrzeń`}
          className={cn('group relative', focusRing)}
        >
          <SpaceMark space={space} />
          <Flyout>{space.name}</Flyout>
        </button>
      </Popover.Trigger>
      {inline ? list : <Popover.Portal>{list}</Popover.Portal>}
    </Popover.Root>
  )
}
