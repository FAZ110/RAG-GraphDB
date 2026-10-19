import type { ReactNode } from 'react'
import { HouseIcon, LayersIcon, NetworkIcon, ScanSearchIcon } from 'lucide-react'
import { focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import { appRoutes } from '../../routes'

const icons: Record<string, ReactNode> = {
  '/': <HouseIcon />,
  '/spaces': <LayersIcon />,
  '/analyses': <ScanSearchIcon />,
  '/graph': <NetworkIcon />,
}

export const navItems = appRoutes
  .filter((route) => route.showInNavbar)
  .map((route) => ({ path: route.path, label: route.label, icon: icons[route.path] }))

export const isActive = (path: string, pathname: string) =>
  path === '/' ? pathname === '/' : pathname.startsWith(path)

const sizes = { icon: 'size-9 justify-center', row: 'h-10 w-full gap-3 px-3' }

export const pressable = (active: boolean, size: keyof typeof sizes = 'icon', className?: string) =>
  cn(
    'group relative inline-flex shrink-0 items-center text-sm font-semibold transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
    sizes[size],
    active
      ? 'bg-fg text-fg-inverse shadow-[inset_2px_2px_0_rgb(0_0_0/0.35)]'
      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
    focusRing,
    className
  )
