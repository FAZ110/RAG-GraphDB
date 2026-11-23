import type { TidyWay } from '@/components/canvas/types'
import { storedValue } from '@/lib/storedValue'

export const TIDY_WAYS: { way: TidyWay; name: string; hint: string }[] = [
  {
    way: 'keep',
    name: 'Tylko rozsuń',
    hint: 'Encje zostają na miejscach, odsuwa tylko nakładające się',
  },
  {
    way: 'refined',
    name: 'Ułóż od nowa',
    hint: 'Cały graf od zera: powiązane obok siebie, mało przecięć',
  },
  {
    way: 'basic',
    name: 'Wygładź obecny',
    hint: 'Delikatnie poprawia obecny układ, bez przebudowy',
  },
]

// Which way tidying goes, remembered between visits.
export const tidyWay = storedValue<TidyWay>('atlas:tidy-way', 'keep', {
  parse: (raw) => (raw === 'basic' || raw === 'refined' ? raw : 'keep'),
  format: (way) => way,
})
