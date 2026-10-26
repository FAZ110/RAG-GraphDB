import type { ReactNode } from 'react'
import { ChevronsUpDownIcon, XIcon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  focusRing,
  IconButton,
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
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-3 border px-3 pt-2 pb-3',
          '[box-shadow:var(--deck-offset-lg)_var(--deck-offset-lg)_0_var(--fg)]',
          'data-[side=left]:inset-y-3 data-[side=left]:left-3 data-[side=left]:h-auto',
          'data-[side=left]:w-[calc(100vw-2.25rem)] data-[side=left]:sm:max-w-md'
        )}
      >
        <header className="flex items-center justify-between">
          <DrawerTitle className="text-heading">Przestrzenie</DrawerTitle>
          <IconButton variant="ghost" label="Zamknij" onClick={() => onOpenChange(false)}>
            <XIcon />
          </IconButton>
        </header>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
