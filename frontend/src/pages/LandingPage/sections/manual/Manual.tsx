import { motion } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { Dealt } from '../../story/Dealt'
import { STEP } from '../../story/timeline'
import { Haze } from '../../story/Haze'
import { Clip } from './Clip'
import { usePan } from './usePan'

const STEPS: Array<{
  title: string
  body: string
  clip: string
  /** What the recording shows, for screen readers. */
  shows: string
  /** The panel's background, which its text veil matches too. */
  slide: string
  contour: string
}> = [
  {
    title: 'Załóż konto i przestrzeń',
    body: 'Przestrzeń to jeden temat. Nazwij ją, a w ustawieniach ekstrakcji podpowiedz modelowi, jakich typów encji ma szukać.',
    clip: 'space',
    shows: 'Tworzenie przestrzeni „Ceny kawy” i ustawianie typów encji.',
    slide: 'var(--page)',
    contour: 'var(--ink-steel)',
  },
  {
    title: 'Dodaj artykuły',
    body: 'Upuść pliki JSON albo wklej artykuły, wybierz model i wyślij. Przetwarzanie trwa w tle, więc możesz zamknąć stronę.',
    clip: 'upload',
    shows: 'Dodawanie ośmiu artykułów z pliku JSON i ich przetwarzanie.',
    slide: 'var(--pastel-sky)',
    contour: 'var(--ink-steel)',
  },
  {
    title: 'Przejrzyj graf',
    body: 'Wyszukaj encję, a graf wyciszy resztę i pokaże jej powiązania oraz zdania, z których pochodzą.',
    clip: 'graph',
    shows: 'Wybór encji Palarnia Ziarno w grafie i podgląd artykułu, który o niej mówi.',
    slide: 'var(--pastel-lilac)',
    contour: 'var(--ink-heather)',
  },
  {
    title: 'Zbuduj analizę',
    body: 'Dodaj na płótno dwie encje i wybierz najkrótszą ścieżkę. Atlas dorysuje to, co je łączy, a analiza zapisze się sama.',
    clip: 'analysis',
    shows: 'Najkrótsza ścieżka od mrozu do kawiarni dodana do nowej analizy.',
    slide: 'var(--pastel-sand)',
    contour: 'var(--ink-ochre)',
  },
]

const MAP = 'absolute inset-0'

interface Props {
  progress: MotionValue<number>
  step: number
}

export function Manual({ progress, step }: Props) {
  const x = usePan(step, STEP.manual, STEPS.length)
  return (
    <Dealt progress={progress} step={STEP.manual} className="[--panel:100vw] lg:[--panel:80vw]">
      <h2 className="sr-only">Instrukcja obsługi</h2>
      <motion.ol className="flex h-full w-max will-change-transform" style={{ x }}>
        {STEPS.map(({ title, body, clip, shows, slide, contour }, i) => (
          <li
            key={title}
            className="relative flex h-full w-(--panel) shrink-0 flex-col justify-center gap-6 border-r-4 border-fg bg-(--slide) px-5 pt-22 pb-20 text-fg sm:px-10 lg:justify-start lg:gap-8 lg:px-14 lg:pb-12"
            style={{ ['--slide' as string]: slide }}
          >
            <ContourBackdrop color={contour} className={MAP} />
            <div className="relative isolate flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              <Haze />
              <div className="flex shrink-0 flex-col gap-3">
                <span className="text-heading text-fg-subtle">
                  Krok {i + 1} z {STEPS.length}
                </span>
                <h3 className="text-chapter">{title}</h3>
              </div>
              <p className="max-w-[44ch] text-base text-fg-muted sm:text-lg">{body}</p>
            </div>
            <div className="relative flex min-h-0 items-center justify-center lg:flex-1">
              <div className="w-full lg:max-w-[calc((100dvh-17rem)*1.6)]">
                <Clip
                  name={clip}
                  label={shows}
                  active={step === STEP.manual + i}
                  near={step >= STEP.manual - 1}
                />
              </div>
            </div>
          </li>
        ))}
      </motion.ol>
    </Dealt>
  )
}
