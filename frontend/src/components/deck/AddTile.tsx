import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashedFrame, focusRing } from './styles'

interface Props extends ComponentProps<'button'> {
  /** Style the only child (e.g. a router Link) as the tile instead of rendering a button. */
  asChild?: boolean
}

export function AddTile({ asChild = false, className, children, ...props }: Props) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      className={cn(
        dashedFrame,
        'flex size-full items-center justify-center gap-2 px-4 text-sm font-semibold text-fg-subtle hover:border-fg hover:text-fg',
        focusRing,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function AddTileIcon() {
  return <PlusIcon className="size-5 shrink-0" aria-hidden="true" />
}
