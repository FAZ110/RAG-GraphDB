import { useLocation } from 'react-router-dom'
import { pickSpace, useLastSpaceId } from '@/components/Spaces/choice/spaceChoice'
import { useSpaces } from '@/hooks/useSpaces'

// The space in the address on space and graph pages, elsewhere the one last looked at or
// picked in the navigation.
export function useCurrentSpace() {
  const { pathname } = useLocation()
  const { data } = useSpaces()
  const last = useLastSpaceId()
  const addressed = pathname.match(/^\/(?:spaces|graph)\/([^/]+)/)?.[1] ?? last
  return { space: data && pickSpace(data, addressed), spaces: data ?? [] }
}
