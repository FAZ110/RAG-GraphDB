import type { MotionValue } from 'motion/react'
import { memo } from 'react'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { Dealt } from '../../story/Dealt'
import { Haze } from '../../story/Haze'
import { STEP } from '../../story/timeline'
import { AtlasWindow } from './AtlasWindow'
import { Callout, CalloutText } from './Callout'
import { ITEMS } from './items'
import { useReveal, useTour } from './useTour'

interface Props {
  progress: MotionValue<number>
  step: number
}

export const Capabilities = memo(function Capabilities({ progress, step }: Props) {
  const tour = useTour(step)
  const reveals = [useReveal(tour, 0), useReveal(tour, 1), useReveal(tour, 2), useReveal(tour, 3)]
  const [spaces, privacy, models, search] = reveals
  const side = (which: 'left' | 'right') =>
    ITEMS.map((item, i) =>
      item.side === which ? <Callout key={item.title} item={item} t={reveals[i]} /> : null
    )
  return (
    <Dealt
      progress={progress}
      step={STEP.more}
      className="bg-(--pastel-rose) text-fg [--slide:var(--pastel-rose)]"
    >
      <ContourBackdrop color="var(--ink-plum)" className="absolute inset-0" />
      <div className="relative mx-auto flex h-full max-w-[100rem] flex-col justify-center gap-6 px-4 pt-20 pb-20 sm:px-8 lg:gap-10 lg:px-12">
        <div className="relative isolate self-start">
          <Haze />
          <h2 className="text-chapter">Atlas potrafi dużo więcej.</h2>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="relative isolate hidden lg:block">{side('left')}</div>
          <div className="w-full lg:w-[min(46rem,48vw,calc((100dvh-19rem)*1.636))]">
            <AtlasWindow spaces={spaces} privacy={privacy} models={models} search={search} />
          </div>
          <div className="relative isolate hidden lg:block">{side('right')}</div>
        </div>
        <ul className="isolate grid grid-cols-2 gap-x-5 gap-y-4 lg:hidden">
          {ITEMS.map((item, i) => (
            <CalloutText key={item.title} item={item} t={reveals[i]} />
          ))}
        </ul>
      </div>
    </Dealt>
  )
})
