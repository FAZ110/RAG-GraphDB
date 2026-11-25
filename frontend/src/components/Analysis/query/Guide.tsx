import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useEffectEvent, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/deck'
import { focusRing } from '@/components/deck/styles'
import { step } from '@/design/motion'
import { cn } from '@/lib/utils'
import { AnswerArt, ConditionsArt, KnownArt, LinkArt, MoreArt, SoughtArt } from './GuideArt'

// Each step: one sentence to remember, a few words more for who wants them.
const STEPS: { lead: string; detail: string; art: ReactNode }[] = [
  {
    lead: 'Zacznij od tego, czego szukasz.',
    detail: '„+ Szukana” wstawia węzeł z lupą. Kliknij go i wybierz typ, np. Zawodnik.',
    art: <SoughtArt />,
  },
  {
    lead: 'Dodaj to, co już znasz.',
    detail:
      '„+ Znana” wyszukuje encję po nazwie. Do jednej znanej możesz dodać kilka encji i utworzyć grupę.',
    art: <KnownArt />,
  },
  {
    lead: 'Połącz je tak, jak są powiązane.',
    detail:
      'Przeciągnij od kropki przy węźle albo użyj „Połącz”. Kliknij połączenie, żeby wybrać relację, kierunek i długość.',
    art: <LinkArt />,
  },
  {
    lead: 'Doprecyzuj warunki.',
    detail:
      'Połączenie może być wymagane, opcjonalne albo wykluczone. Szukana może mieć np. co najmniej 2 powiązania z typem Klub.',
    art: <ConditionsArt />,
  },
  {
    lead: 'Odpowiedź pojawia się od razu.',
    detail:
      'Kliknij wynik, żeby zobaczyć, dlaczego pasuje. „Pokaż” doda wyniki do analizy albo wyróżni je na grafie.',
    art: <AnswerArt />,
  },
  {
    lead: 'Pytaj o więcej niż proste powiązania.',
    detail:
      'Wykluczenia, opcjonalne połączenia, grupy „co najmniej K z” i encje wspominane razem. „W analizie” zawęża wyniki do płótna, a </> pokazuje Cypher.',
    art: <MoreArt />,
  },
]

/** How the module works, a step at a time with a picture each, in place of the sheet. */
export function Guide({ onClose }: { onClose: () => void }) {
  const [at, setAt] = useState(0)
  const [dir, setDir] = useState(1)
  const go = (to: number) => {
    if (to < 0 || to >= STEPS.length) return
    setDir(to > at ? 1 : -1)
    setAt(to)
  }
  const last = at === STEPS.length - 1

  // Arrows step through; Escape puts the guide away before the modal sees it.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowLeft') go(at - 1)
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])

  return (
    <section
      aria-label="Jak to działa"
      className="flex h-full animate-in flex-col items-center bg-surface px-8 pt-6 pb-5 fade-in-0 spring-quick"
    >
      {/* Everything in one column down the middle: picture, sentence, then the way on. */}
      <div className="relative flex min-h-0 w-full max-w-4xl flex-1 flex-col">
        {/* One step replacing another: forward comes in from the end, back from the start. */}
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={at}
            custom={dir}
            variants={step}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex min-h-0 flex-1 flex-col gap-5"
          >
            <div className="min-h-0 flex-1">{STEPS[at].art}</div>
            {/* The sentence to take away, large; the rest small for who wants it. */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-2xl leading-tight font-semibold tracking-tight text-fg">
                {STEPS[at].lead}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fg-soft">{STEPS[at].detail}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-5 flex w-full max-w-4xl items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => go(at - 1)} disabled={at === 0}>
          <ArrowLeftIcon />
          Wstecz
        </Button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <div className="flex gap-1.5" role="tablist" aria-label="Kroki">
            {STEPS.map((s, i) => (
              <button
                key={s.lead}
                type="button"
                role="tab"
                aria-selected={i === at}
                aria-label={`Krok ${i + 1}: ${s.lead}`}
                onClick={() => go(i)}
                className={cn(
                  'h-2 transition-[width,background-color] spring-quick',
                  i === at ? 'w-6 bg-fg' : 'w-2 bg-line hover:bg-fg-subtle',
                  focusRing
                )}
              />
            ))}
          </div>
          <span className="ml-2 text-xs text-fg-subtle tabular-nums">
            {at + 1} z {STEPS.length}
          </span>
        </div>
        {last ? (
          <Button size="sm" variant="primary" onClick={onClose}>
            Zaczynam
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={() => go(at + 1)}>
            Dalej
            <ArrowRightIcon />
          </Button>
        )}
      </footer>
    </section>
  )
}
