import { useMediaQuery } from '@/hooks/useMediaQuery'

// The text keeps the drawer's closed width while the outline slides out beside it, so it
// never reflows.
export const ARTICLE_COLUMN = 'w-[42rem] shrink-0'

export function useOutlineWidth(): number {
  const roomy = useMediaQuery('(min-width: 90rem)')
  const wide = useMediaQuery('(min-width: 80rem)')
  return roomy ? 560 : wide ? 480 : 320
}
