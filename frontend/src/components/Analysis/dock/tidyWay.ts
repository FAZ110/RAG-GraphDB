import type { TidyWay } from '@/components/canvas/types'
import { storedValue } from '@/lib/storedValue'

export const TIDY_WAYS: { way: TidyWay; name: string; hint: string }[] = [
  { way: 'refined', name: 'Dopracowane', hint: 'Grupy powiązanych, miejsce na etykiety' },
  { way: 'basic', name: 'Podstawowe', hint: 'Same sprężyny, od obecnego układu' },
]

// Which way tidying goes, remembered between visits.
export const tidyWay = storedValue<TidyWay>('atlas:tidy-way', 'refined', {
  parse: (raw) => (raw === 'basic' ? 'basic' : 'refined'),
  format: (way) => way,
})
