import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { Swatch } from '@/components/deck'
import { into, STEP } from './timeline'

/** The entity panel of the graph, shown with the sentence the entity came from. */
export function Inspector({ progress }: { progress: MotionValue<number> }) {
  const times = [
    into(STEP.source, 0.3),
    into(STEP.source, 0.75),
    STEP.source,
    into(STEP.canvas, 0.25),
  ]
  const x = useTransform(progress, times, ['120%', '0%', '0%', '120%'])
  const visibility = useTransform(progress, (p) =>
    p > times[0] && p < times[3] ? 'visible' : 'hidden'
  )
  return (
    <motion.aside
      aria-label="Panel encji"
      className="deck-lg absolute right-0 bottom-[4%] w-[min(25rem,100%)] border border-fg bg-surface p-4 text-fg [--deck-shadow:var(--ink-plum)] sm:p-5"
      style={{ x, visibility }}
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
        <Swatch color="var(--ink-plum)" />
        Firma
      </p>
      <h3 className="mt-1 text-heading">Palarnia</h3>
      <p className="mt-3 border-l-4 border-(--ink-plum) pl-3 text-sm text-fg-soft">
        <mark className="bg-(--ink-plum-field) text-(--ink-plum)">Palarnia</mark> podnosi ceny od
        piątku, bo zielone ziarno drożeje trzeci miesiąc z rzędu.
      </p>
      <p className="mt-2 text-xs text-fg-subtle">Cennik hurtowy, dokument 147 z 212</p>
    </motion.aside>
  )
}
