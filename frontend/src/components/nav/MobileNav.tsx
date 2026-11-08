import { useState } from 'react'
import { MenuIcon, SearchIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Drawer, DrawerTrigger, focusRing } from '@/components/deck'
import { useOpenGlobalSearch } from '@/components/search/globalSearchContext'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { AtlasMark } from './AtlasMark'
import { MobileMenu } from './MobileMenu'
import { isActive, navItems, pressable } from './navItems'

export function MobileNav({ space, spaces }: { space?: Space; spaces: Space[] }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const openSearch = useOpenGlobalSearch()
  const current = navItems.find((item) => isActive(item.path, pathname))

  return (
    // Lined up with the page's cards, which keep 8px on the right for their shadows.
    <header className="sticky top-0 z-20 bg-page pt-3 pr-6 pl-4 sm:hidden">
      <div className="deck flex h-12 items-center gap-3 border border-fg bg-surface px-1.5 [--deck-shadow:var(--fg)]">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button type="button" aria-label="Otwórz nawigację" className={pressable(false)}>
              <MenuIcon />
            </button>
          </DrawerTrigger>
          <MobileMenu space={space} spaces={spaces} onClose={() => setOpen(false)} />
        </Drawer>

        <Link to="/" className={cn('flex items-center gap-2 font-bold text-fg', focusRing)}>
          <AtlasMark />
          Atlas
        </Link>
        {current && <span className="truncate text-sm text-fg-subtle">{current.label}</span>}

        <button
          type="button"
          onClick={openSearch}
          aria-label="Szukaj"
          className={pressable(false, 'icon', 'ml-auto')}
        >
          <SearchIcon />
        </button>
      </div>
    </header>
  )
}
