import type { ReactNode } from 'react'
import { ChevronsUpDownIcon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  focusRing,
  surface,
} from '@/components/deck'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'

interface Props {
  space: Space | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function SpaceSwitcher({ space, open, onOpenChange, children }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={cn(
            surface,
            'mr-2 flex h-12 items-center gap-3 px-3 text-left hover:border-fg',
            focusRing
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-fg-subtle">Przestrzeń</span>
            <span className="block truncate font-semibold text-fg">
              {space?.name ?? 'Wybierz przestrzeń'}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-fg-subtle" />
        </button>
      </DrawerTrigger>
      <DrawerContent
        side="left"
        className="flex flex-col gap-4 bg-surface-sunken p-4 pt-12 data-[side=left]:sm:max-w-md"
      >
        <DrawerTitle className="sr-only">Przestrzenie</DrawerTitle>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
