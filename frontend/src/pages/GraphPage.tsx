import { useEffect } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, ErrorNote } from '@/components/deck'
import { SpaceMap } from '@/components/graph-map/SpaceMap'
import { pickSpace, rememberSpace } from '@/components/Spaces/choice/spaceChoice'
import { useSpaces } from '@/hooks/useSpaces'

export function GraphPage() {
  const { spaceId } = useParams()
  // An entity to open on, e.g. picked in the global search.
  const focus = useSearchParams()[0].get('focus')
  const spaces = useSpaces()
  const space = spaces.data && pickSpace(spaces.data, spaceId ?? null)

  useEffect(() => {
    if (space) rememberSpace(space.id)
  }, [space])

  if (spaces.error) return <ErrorNote>{spaces.error.message}</ErrorNote>
  if (!spaces.data) return null
  if (!space) {
    return (
      <EmptyState
        title="Nie masz jeszcze żadnej przestrzeni"
        className="min-h-80"
        action={
          <Button asChild variant="primary" size="sm">
            <Link to="/spaces">Utwórz przestrzeń</Link>
          </Button>
        }
      >
        Graf powstaje z artykułów dodanych do przestrzeni.
      </EmptyState>
    )
  }

  return (
    <>
      {/* Shown while the address catches up, so the page isn't torn down and rebuilt. */}
      {space.id !== spaceId && <Navigate to={`/graph/${space.id}`} replace />}
      <SpaceMap key={space.id} space={space} spaces={spaces.data} focus={focus} />
    </>
  )
}
