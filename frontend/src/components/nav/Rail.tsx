import { SettingsIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { focusRing } from '@/components/deck'
import { useSpaceListHidden } from '@/components/Spaces/list/spaceListHidden'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import type { Space } from '@/types'
import { AtlasMark } from './AtlasMark'
import { Flyout } from './Flyout'
import { isActive, navItems } from './navItems'
import { PullTab } from './PullTab'
import { RailLink } from './RailLink'
import { SpaceTile } from './SpaceTile'

export function Rail({ space, spaces }: { space?: Space; spaces: Space[] }) {
  const { pathname } = useLocation()
  // Where the spaces page shows its list beside the space, its item puts the list away into
  // the rail and brings it back.
  const listBeside = useMediaQuery('(min-width: 64rem)') && pathname.startsWith('/spaces')
  const list = useSpaceListHidden()

  return (
    <header className="sticky top-0 z-20 hidden h-dvh shrink-0 py-6 pl-6 sm:block lg:py-8 lg:pl-8">
      <nav className="deck flex h-full w-14 flex-col items-center gap-2 border border-fg bg-surface py-3 [--deck-shadow:var(--fg)]">
        <Link
          to="/"
          aria-label="Atlas, strona startowa"
          className={cn('group relative text-fg', focusRing)}
        >
          <AtlasMark />
          <Flyout>Atlas</Flyout>
        </Link>
        {space && <SpaceTile space={space} spaces={spaces} side="right" />}
        <span className="h-px w-8 bg-line" />

        {navItems.map((item) =>
          listBeside && item.path === '/spaces' ? (
            <RailLink
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={list.hidden ? 'Pokaż listę przestrzeni' : 'Schowaj listę przestrzeni'}
              active
              aria-expanded={!list.hidden}
              onClick={(e) => {
                e.preventDefault()
                list.setHidden(!list.hidden)
              }}
            >
              <PullTab out={!list.hidden} />
            </RailLink>
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
          className="mt-auto"
        />
      </nav>
    </header>
  )
}
