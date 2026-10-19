import { SettingsIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { DrawerContent, DrawerTitle } from '@/components/deck'
import type { Space } from '@/types'
import { AtlasMark } from './AtlasMark'
import { isActive, navItems, pressable } from './navItems'
import { SpaceTile } from './SpaceTile'

interface Props {
  space?: Space
  spaces: Space[]
  onClose: () => void
}

export function MobileMenu({ space, spaces, onClose }: Props) {
  const { pathname } = useLocation()
  const link = (path: string) => {
    const active = isActive(path, pathname)
    return { to: path, onClick: onClose, 'aria-current': active ? ('page' as const) : undefined }
  }

  return (
    <DrawerContent
      side="left"
      className="border-fg p-4 data-[side=left]:inset-y-3 data-[side=left]:left-3 data-[side=left]:h-auto data-[side=left]:w-72 data-[side=left]:max-w-[calc(100%-1.5rem)] data-[side=left]:border"
      style={{ boxShadow: 'var(--deck-offset-lg) var(--deck-offset-lg) 0 var(--fg)' }}
    >
      <DrawerTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
        <AtlasMark />
        Atlas
      </DrawerTitle>

      {space && (
        <div className="flex items-center gap-3 border border-line-soft bg-surface-sunken p-2">
          <SpaceTile space={space} spaces={spaces} side="bottom" onPicked={onClose} inline />
          <span className="min-w-0">
            <span className="block text-xs text-fg-subtle">Przestrzeń</span>
            <span className="block truncate font-semibold text-fg">{space.name}</span>
          </span>
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            {...link(item.path)}
            className={pressable(isActive(item.path, pathname), 'row')}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <Link
        {...link('/settings')}
        className={pressable(isActive('/settings', pathname), 'row', 'mt-auto')}
      >
        <SettingsIcon />
        Ustawienia
      </Link>
    </DrawerContent>
  )
}
