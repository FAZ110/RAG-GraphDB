export const SHEET = { width: 320, height: 420 }

export interface PileSheet {
  kind: string
  title: [string, string]
  /** One of the documents that hold the chain. */
  link?: boolean
  hero: { x: number; y: number; rotate: number }
  scattered: { x: number; y: number; rotate: number }
}

// Painted in this order, so the documents that matter end up on top.
export const PILE: PileSheet[] = [
  {
    kind: 'Kurs walut',
    title: ['Real traci', 'na wartości'],
    hero: { x: 300, y: 410, rotate: -16 },
    scattered: { x: -30, y: 40, rotate: -9 },
  },
  {
    kind: 'Fracht morski',
    title: ['Porty bez', 'kontenerów'],
    hero: { x: 720, y: 400, rotate: 15 },
    scattered: { x: 700, y: 560, rotate: 8 },
  },
  {
    kind: 'Rolnictwo',
    title: ['Mniej rąk', 'do pracy'],
    hero: { x: 400, y: 350, rotate: 9 },
    scattered: { x: 330, y: 300, rotate: 5 },
  },
  {
    kind: 'Handel',
    title: ['Kontrakty', 'na grudzień'],
    hero: { x: 620, y: 360, rotate: -11 },
    scattered: { x: 690, y: -10, rotate: -6 },
  },
  {
    kind: 'Kultura',
    title: ['Rekord', 'sprzedaży'],
    hero: { x: 500, y: 410, rotate: 4 },
    scattered: { x: 60, y: 600, rotate: 11 },
  },
  {
    kind: 'Prognoza pogody',
    title: ['Mróz wraca', 'do Brazylii'],
    link: true,
    hero: { x: 340, y: 320, rotate: -7 },
    scattered: { x: 40, y: 10, rotate: 4 },
  },
  {
    kind: 'Raport zbiorów',
    title: ['Plantacje', 'bez ziaren'],
    link: true,
    hero: { x: 680, y: 330, rotate: 7 },
    scattered: { x: 510, y: 30, rotate: -5 },
  },
  {
    kind: 'Notowania',
    title: ['Kawa najdroższa', 'od lat'],
    link: true,
    hero: { x: 450, y: 300, rotate: -3 },
    scattered: { x: -20, y: 480, rotate: -6 },
  },
  {
    kind: 'Cennik hurtowy',
    title: ['Ziarno', 'znów w górę'],
    link: true,
    hero: { x: 570, y: 310, rotate: 11 },
    scattered: { x: 340, y: 340, rotate: 7 },
  },
  {
    kind: 'Kawiarnia',
    title: ['Nowe ceny', 'od piątku'],
    link: true,
    hero: { x: 510, y: 280, rotate: -6 },
    scattered: { x: 690, y: 520, rotate: -7 },
  },
]
