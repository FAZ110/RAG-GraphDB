import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorNote } from '@/components/deck'
import { SpaceList } from '@/components/Spaces/list/SpaceList'
import { SpaceSwitcher } from '@/components/Spaces/list/SpaceSwitcher'
import { SpacePanel } from '@/components/Spaces/SpacePanel'
import { pickSpace, rememberSpace } from '@/components/Spaces/choice/spaceChoice'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSpaceListHidden } from '@/components/Spaces/list/spaceListHidden'
import { cn } from '@/lib/utils'
import { useSpaces } from '@/hooks/useSpaces'
import type { Space } from '@/types'

export function SpacesPage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const spaces = useSpaces()
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const [draftState, setDraft] = useState<string | null>(null)
  // `?new`, e.g. from the navigation, opens a draft right away.
  const draft = draftState ?? (params.has('new') ? '' : null)
  const changeDraft = (next: string | null) => {
    setDraft(next)
    if (params.has('new')) setParams({}, { replace: true })
  }
  const { hidden, setHidden } = useSpaceListHidden()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 64rem)')
  const listHidden = wide && hidden

  // Already in the user's order from the API.
  const ordered = spaces.data ?? []
  const listProps = {
    spaces: ordered,
    loading: !spaces.data,
    query,
    onQueryChange: setQuery,
    draft,
    onDraftChange: changeDraft,
    onCreated: (space: Space) => navigate(`/spaces/${space.id}`),
  }
  // Shown while the redirect catches up, so the page isn't torn down and rebuilt.
  const addressed = ordered.find((s) => s.id === spaceId)
  // Without one in the address, the space picked last.
  const selected = addressed ?? pickSpace(ordered, null)

  // So other pages open on the space last looked at.
  useEffect(() => {
    if (selected) rememberSpace(selected.id)
  }, [selected])

  return (
    // The phone navbar and the page's vertical padding.
    <div
      className={`stage grid h-[calc(100dvh-var(--nav-block)-2rem)] min-h-[28rem] grid-rows-[auto_minmax(0,1fr)] gap-4 sm:h-[calc(100dvh-3rem)] sm:gap-6 lg:h-[calc(100dvh-4rem)] lg:grid-rows-[minmax(0,1fr)] ${
        listHidden
          ? 'lg:grid-cols-[0rem_minmax(0,1fr)] lg:gap-x-0'
          : 'lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-8 2xl:grid-cols-[26rem_minmax(0,1fr)]'
      }`}
    >
      {selected && !addressed && (
        // Keeps the query, e.g. `?new` asking for a draft.
        <Navigate to={{ pathname: `/spaces/${selected.id}`, search: params.toString() }} replace />
      )}

      <h1 className="sr-only">Przestrzenie</h1>
      {wide ? (
        // Put away, the list slides left into the navigation rail at its full width, so it is
        // cut off by the narrowing column instead of squeezed.
        <aside inert={listHidden} className="relative min-h-0 overflow-hidden">
          <div
            className={cn(
              'flex h-full flex-col gap-4 transition-[opacity,translate] duration-500 ease-deck motion-reduce:transition-none lg:w-[20rem] xl:w-[24rem] 2xl:w-[26rem]',
              listHidden && '-translate-x-full opacity-0'
            )}
          >
            {spaces.error && <ErrorNote>{spaces.error.message}</ErrorNote>}
            <SpaceList {...listProps} selectedId={selected?.id} onHide={() => setHidden(true)} />
          </div>
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
