export const LINES = [
  'Mróz w Minas Gerais',
  'zniszczył część plantacji.',
  'Zbiory kawy będą niższe,',
  'a ceny na Giełdzie kawy',
  'już rosną.',
]

export type Point = readonly [number, number]

export interface Entity {
  id: string
  /** As written in the article; none for an entity that comes from another document. */
  word: string | null
  /** As the graph names it. */
  name: string
  line: number
  ink: string
  graph: Point
  canvas: Point
  /** Left behind when the chain moves onto the canvas. */
  offCanvas?: boolean
}

export const ENTITIES: Entity[] = [
  {
    id: 'frost',
    word: 'Mróz',
    name: 'Mróz',
    line: 0,
    ink: 'steel',
    graph: [170, 210],
    canvas: [225, 370],
  },
  {
    id: 'region',
    word: 'Minas Gerais',
    name: 'Minas Gerais',
    line: 0,
    ink: 'fir',
    graph: [590, 140],
    canvas: [590, 140],
    offCanvas: true,
  },
  {
    id: 'harvest',
    word: 'Zbiory kawy',
    name: 'Zbiory kawy',
    line: 2,
    ink: 'ochre',
    graph: [250, 480],
    canvas: [705, 370],
  },
  {
    id: 'market',
    word: 'Giełdzie kawy',
    name: 'Giełda kawy',
    line: 3,
    ink: 'cobalt',
    graph: [690, 420],
    canvas: [705, 560],
  },
  {
    id: 'roaster',
    word: null,
    name: 'Palarnia',
    line: 0,
    ink: 'plum',
    graph: [380, 760],
    canvas: [225, 560],
  },
  {
    id: 'cup',
    word: null,
    name: 'Twoja kawa',
    line: 0,
    ink: 'cherry',
    graph: [810, 720],
    canvas: [225, 750],
  },
]

export interface Relation {
  from: string
  to: string
  label: string
}

/** What the first document says. */
export const STATED: Relation[] = [
  { from: 'frost', to: 'region', label: 'uderzył w' },
  { from: 'frost', to: 'harvest', label: 'niszczy' },
  { from: 'harvest', to: 'market', label: 'podbijają ceny' },
]

/** The links that come from other documents. */
export const HIDDEN: Relation[] = [
  { from: 'market', to: 'roaster', label: 'droższe ziarno' },
  { from: 'roaster', to: 'cup', label: 'nowy cennik' },
]

/** The chain from the frost to the cup, in order. */
export const ROUTE: Relation[] = [
  { from: 'frost', to: 'harvest', label: '' },
  { from: 'harvest', to: 'market', label: '' },
  { from: 'market', to: 'roaster', label: '' },
  { from: 'roaster', to: 'cup', label: '' },
]

/** Entities from other documents, filling out the map around the story. */
export const NEIGHBOURS: Array<{
  name: string
  ink: string
  at: Point
  to: string[]
  side: 'left' | 'right'
}> = [
  { name: 'Brazylia', ink: 'fir', at: [400, 40], to: ['frost', 'region'], side: 'right' },
  { name: 'Plantacje', ink: 'ochre', at: [80, 70], to: ['frost'], side: 'right' },
  { name: 'Eksport', ink: 'cobalt', at: [770, 270], to: ['region', 'market'], side: 'left' },
  { name: 'Arabika', ink: 'ochre', at: [440, 310], to: ['harvest', 'market'], side: 'right' },
  { name: 'Susza', ink: 'steel', at: [55, 318], to: ['frost', 'harvest'], side: 'right' },
  { name: 'Kontrakty', ink: 'cobalt', at: [450, 645], to: ['market'], side: 'left' },
  { name: 'Kurs dolara', ink: 'teal', at: [770, 600], to: ['market'], side: 'left' },
  { name: 'Fracht morski', ink: 'teal', at: [120, 640], to: ['harvest'], side: 'right' },
]
