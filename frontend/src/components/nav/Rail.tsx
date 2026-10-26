import { PanelLeftOpenIcon, SearchIcon, SettingsIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { IconSwap, focusRing } from '@/components/deck'
import { useOpenGlobalSearch } from '@/components/search/globalSearchContext'
import { useSpaceListHidden } from '@/components/Spaces/list/spaceListHidden'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { AtlasMark } from './AtlasMark'
import { Flyout } from './Flyout'
import { isActive, navItems, pressable } from './navItems'
import { RailLink } from './RailLink'
import { SpaceTile } from './SpaceTile'

export function Rail({ space, spaces }: { space?: Space; spaces: Space[] }) {
  const { pathname } = useLocation()
  const openSearch = useOpenGlobalSearch()
  const list = useSpaceListHidden()
  const togglesList = useMediaQuery('(min-width: 64rem)') && pathname.startsWith('/spaces')

  return (
    <header className="sticky top-0 z-20 hidden h-dvh shrink-0 py-6 pl-6 sm:block lg:py-8 lg:pl-8">
      <nav className="deck flex h-full w-14 flex-col items-center gap-2 border border-fg bg-surface py-2 [--deck-shadow:var(--fg)]">
        <Link
          to="/"
          aria-label="Atlas, strona startowa"
          className={cn('group relative flex h-11 items-center text-fg', focusRing)}
        >
          <AtlasMark size={28} />
          <Flyout>Atlas</Flyout>
        </Link>
        <span className="h-px w-8 bg-line" />
        {space && <SpaceTile space={space} spaces={spaces} side="right" />}

        <button
          type="button"
          onClick={openSearch}
          aria-label="Szukaj"
          aria-keyshortcuts="Meta+K Control+K"
          className={pressable(false)}
        >
          <SearchIcon />
          <Flyout>
            Szukaj <span className="font-normal text-fg-inverse-muted">⌘K</span>
          </Flyout>
        </button>

        {navItems.map((item) =>
          togglesList && item.path === '/spaces' ? (
            <RailLink
              key={item.path}
              to={item.path}
              icon={
                <IconSwap id={list.hidden ? 'unfold' : 'fold'}>
                  {list.hidden ? <PanelLeftOpenIcon /> : item.icon}
                </IconSwap>
              }
              label={list.hidden ? 'Rozwiń listę przestrzeni' : 'Zwiń listę przestrzeni'}
              active
              aria-expanded={!list.hidden}
              onClick={(e) => {
                e.preventDefault()
                list.setHidden(!list.hidden)
              }}
            />
          ) : (
            <RailLink
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path, pathname)}
            />
          )
        )}

        <RailLink
          to="/settings"
          icon={<SettingsIcon />}
          label="Ustawienia"
          active={isActive('/settings', pathname)}
          group="settings"
          className="mt-auto"
        />
      </nav>
    </header>
  )
}
