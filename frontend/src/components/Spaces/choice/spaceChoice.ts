import { storedValue } from '@/lib/storedValue'
import type { Space } from '@/types'

const lastSpace = storedValue<string | null>('atlas:last-space', null, {
  parse: (raw) => raw,
  format: (id) => id ?? '',
})

export const rememberSpace = (spaceId: string) => lastSpace.set(spaceId)

export const useLastSpaceId = () => lastSpace.useValue()

/** The preferred space if it still exists, otherwise the last used one, otherwise the first. */
export function pickSpace(spaces: Space[], preferred: string | null): Space | undefined {
  const byId = (id: string | null) => spaces.find((s) => s.id === id)
  return byId(preferred) ?? byId(lastSpace.get()) ?? spaces[0]
}
