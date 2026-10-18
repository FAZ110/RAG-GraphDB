import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorNote } from '@/components/deck'
import { SpaceList } from '@/components/Spaces/list/SpaceList'
import { SpaceSwitcher } from '@/components/Spaces/list/SpaceSwitcher'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { SpacePanel } from '@/components/Spaces/SpacePanel'
import { rememberSpace } from '@/components/Spaces/choice/spaceChoice'
import { inkFor } from '@/design/inks'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSpaces } from '@/hooks/useSpaces'
import type { Space } from '@/types'

export function SpacesPage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const spaces = useSpaces()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 64rem)')

  // Already in the user's order from the API.
  const ordered = spaces.data ?? []
  const listProps = {
    spaces: ordered,
    loading: !spaces.data,
    query,
    onQueryChange: setQuery,
    draft,
    onDraftChange: setDraft,
    onCreated: (space: Space) => navigate(`/spaces/${space.id}`),
  }
  // Shown while the redirect catches up, so the page isn't torn down and rebuilt.
  const addressed = ordered.find((s) => s.id === spaceId)
  const selected = addressed ?? ordered[0]

  // So other pages open on the space last looked at.
  useEffect(() => {
    if (selected) rememberSpace(selected.id)
  }, [selected])

  return (
    // Navbar (4rem + 1px border) and the page's vertical padding.
    <div className="stage grid h-[calc(100dvh-4rem-1px-2rem)] min-h-[28rem] grid-rows-[auto_minmax(0,1fr)] gap-4 sm:h-[calc(100dvh-4rem-1px-3rem)] sm:gap-6 lg:h-[calc(100dvh-4rem-1px-4rem)] lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-8 2xl:grid-cols-[26rem_minmax(0,1fr)]">
      <ContourBackdrop color={selected ? inkFor(selected.id).color : 'var(--fg-faint)'} />
      {selected && !addressed && <Navigate to={`/spaces/${selected.id}`} replace />}

      <h1 className="sr-only">Przestrzenie</h1>
      {wide ? (
        <aside className="relative flex min-h-0 flex-col gap-4">
          {spaces.error && <ErrorNote>{spaces.error.message}</ErrorNote>}
          <SpaceList {...listProps} selectedId={selected?.id} />
        </aside>
      ) : (
        <SpaceSwitcher space={selected} open={switcherOpen} onOpenChange={setSwitcherOpen}>
          {spaces.error && <ErrorNote>{spaces.error.message}</ErrorNote>}
          <SpaceList
            {...listProps}
            selectedId={selected?.id}
            onPicked={() => setSwitcherOpen(false)}
          />
        </SpaceSwitcher>
      )}

      {/* The right padding is the room for the cards' offset shadows; the list column and the
          switcher keep the same 8px, so every column ends on one line. */}
      <section className="relative min-h-0 overflow-x-hidden overflow-y-auto pr-2">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <SpacePanel key={selected.id} space={selected} />
          ) : (
            spaces.data && (
              <EmptyState
                key="empty"
                framed={false}
                title="Nie masz jeszcze żadnej przestrzeni"
                className="h-full"
              >
                Utwórz pierwszą przyciskiem + obok wyszukiwarki.
              </EmptyState>
            )
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
