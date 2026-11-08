/** The window's drawing size; callouts point at heights within it. */
export const WINDOW = { width: 720, height: 440 }

export interface CapabilityItem {
  title: string
  body: string
  side: 'left' | 'right'
  /** Height of the part of the window it points at, in the window's units. */
  at: number
}

export const ITEMS: CapabilityItem[] = [
  {
    title: 'Niezależne przestrzenie',
    body: 'Dziel artykuły na osobne tematy i projekty.',
    side: 'left',
    at: 28,
  },
  {
    title: 'Widoczne tylko dla Ciebie',
    body: 'Dokumenty, grafy i analizy należą do Twojego konta.',
    side: 'right',
    at: 28,
  },
  {
    title: 'Własne modele językowe',
    body: 'Podłącz swój model, także działający lokalnie.',
    side: 'left',
    at: 236,
  },
  {
    title: 'Wyszukiwanie po znaczeniu',
    body: 'Znajduj encje własnymi słowami we wszystkich przestrzeniach.',
    side: 'right',
    at: 398,
  },
]
