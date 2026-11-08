import { storedValue } from '@/lib/storedValue'

// Shared by the spaces page and the rail's toggle, which puts the list away into the rail.
const listHidden = storedValue('atlas:space-list-hidden', false, {
  parse: (raw) => raw === '1',
  format: (hidden) => (hidden ? '1' : '0'),
})

export function useSpaceListHidden() {
  return { hidden: listHidden.useValue(), setHidden: listHidden.set }
}
