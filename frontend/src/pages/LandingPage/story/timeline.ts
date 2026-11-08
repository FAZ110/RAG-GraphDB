export const STEP = {
  hero: 0,
  wall: 1,
  read: 2,
  graph: 3,
  path: 4,
  source: 5,
  canvas: 6,
  tools: 7,
  more: 8,
  manual: 9,
  final: 13,
} as const

export const LAST_STEP = STEP.final

/** A moment of the move into `step`, which runs from the step before it; 0 starts it, 1 rests. */
export const into = (step: number, share: number) => step - 1 + share

/** Far enough below the world to clear the screen, whose height the world doesn't fill on a phone. */
export const OFFSTAGE = 2800

export interface Chapter {
  step: number
  title: string
  body: string
}

export const CHAPTERS: Chapter[] = [
  {
    step: STEP.wall,
    title: 'Wszystko już napisano.\nTylko nie w jednym miejscu.',
    body: 'Mróz jest w prognozie, zbiory w raporcie, ceny w notowaniach. Nikt nie czyta ich razem, więc nikt nie widzi, co je łączy.',
  },
  {
    step: STEP.read,
    title: 'Atlas czyta każde zdanie.',
    body: 'Wgrywasz pliki, a model przechodzi przez nie jeden po drugim i zaznacza to, co ważne. Sam decydujesz, jakich typów encji ma szukać.',
  },
  {
    step: STEP.graph,
    title: 'Z tekstu powstaje graf.',
    body: 'Zdania zamieniają się w sieć powiązań, a każdy nowy dokument rozbudowuje tę samą mapę.',
  },
  {
    step: STEP.path,
    title: 'Mróz w Brazylii\nzapłacisz w piątek rano.',
    body: 'Żaden dokument tego nie mówi. Prognoza zna mróz, cennik zna cenę. Graf łączy je w czterech krokach, bo widzi wszystko naraz.',
  },
  {
    step: STEP.source,
    title: 'Każda informacja ma źródło.',
    body: 'Kliknij dowolną encję, a zobaczysz zdania z dokumentów, z których pochodzi.',
  },
  {
    step: STEP.canvas,
    title: 'Zbuduj z tego analizę.',
    body: 'Wystartuj od encji, artykułu albo pustego płótna i interaktywnie badaj swoją przestrzeń. Analiza zapisuje się sama, więc w każdej chwili do niej wrócisz.',
  },
  {
    step: STEP.tools,
    title: 'Płótno podpowiada dalej.',
    body: 'Rozwiń powiązania, znajdź wspólnych sąsiadów albo najkrótszą ścieżkę. Atlas proponuje kolejne encje, a Ty decydujesz, które dodać.',
  },
]
