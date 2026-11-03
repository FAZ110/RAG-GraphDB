import { useLocation } from 'react-router-dom'
import { useCurrentSpace } from '@/components/nav/useCurrentSpace'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { inkFor } from '@/design/inks'

const ANALYSIS = /^\/analyses\/[^/]+\/[^/]+/

// An analysis draws its own map paper, which the contours would run through.
export function PageBackdrop() {
  const { pathname } = useLocation()
  const { space } = useCurrentSpace()
  if (ANALYSIS.test(pathname)) return null
  return <ContourBackdrop color={space ? inkFor(space.id).color : 'var(--fg-faint)'} />
}
