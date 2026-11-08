import { memo } from 'react'
import { useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { Marked } from '@/components/deck'
import { AtlasLandmark } from '@/components/nav/AtlasLandmark'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { AuthLinks } from '../AuthLinks'
import { Dealt } from '../story/Dealt'
import { into, STEP } from '../story/timeline'

// The lines clear around the words in the middle; the mark hides them where it lies.
const AROUND_TEXT =
  'absolute inset-0 mask-[radial-gradient(ellipse_44%_34%_at_50%_48%,transparent_50%,black_100%)]'

export const FinalCall = memo(function FinalCall({ progress }: { progress: MotionValue<number> }) {
  const scaleX = useTransform(progress, [into(STEP.final, 0.35), into(STEP.final, 0.75)], [0, 1])
  return (
    <Dealt progress={progress} step={STEP.final} className="bg-(--pastel-sky) text-fg">
      <ContourBackdrop color="var(--ink-steel)" className={AROUND_TEXT} />
      <AtlasLandmark
        className="top-[34%] -left-[34vw] sm:-left-[12vw] lg:top-[-14vh] lg:-left-[22vw] [&_svg]:size-[120vw] lg:[&_svg]:size-[128vh]"
        ground="var(--pastel-sky)"
        tint="text-surface opacity-45"
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-4 text-center sm:gap-7 sm:px-8">
        <h2 className="isolate text-poster [font-size:min(9.5vw,15vh)]">
          Co{' '}
          <Marked ink="plum" frame={{ style: { scaleX } }}>
            przeoczyłeś
          </Marked>
          <br />w swoich tekstach?
        </h2>
        <p className="max-w-[54rem] text-lg text-balance text-fg-soft sm:text-xl">
          Wgraj swoje dokumenty i zobacz, co je łączy.
        </p>
        <AuthLinks />
      </div>
      <p className="absolute inset-x-0 bottom-6 px-20 text-center text-sm text-fg-muted">
        Atlas to praca inżynierska realizowana przez Szymona Barczyka i Jana Dyląga. Dokumenty w tej
        prezentacji są fikcyjne.
      </p>
    </Dealt>
  )
})
