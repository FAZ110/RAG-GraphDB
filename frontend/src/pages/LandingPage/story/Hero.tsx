import { memo } from 'react'
import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { Marked } from '@/components/deck'
import { move } from '@/design/motion'
import { AtlasBadge } from '../AtlasBadge'
import { AuthLinks } from '../AuthLinks'
import { into, STEP } from './timeline'

const MARK_DELAY = 0.35

export const Hero = memo(function Hero({ progress }: { progress: MotionValue<number> }) {
  const times = [0, into(STEP.wall, 0.4)]
  const opacity = useTransform(progress, times, [1, 0])
  const y = useTransform(progress, times, [0, -160])
  const visibility = useTransform(opacity, (o) => (o > 0 ? 'visible' : 'hidden'))
  return (
    <motion.div
      data-landing-hero
      className="absolute inset-x-0 top-0 z-10 px-4 pt-[clamp(2.5rem,8vh,5.5rem)] text-center will-change-transform sm:px-8"
      style={{ y, visibility }}
    >
      <div className="relative isolate mx-auto w-fit max-w-full">
        <motion.div
          className="flex flex-col items-center gap-4 will-change-[opacity] sm:gap-5"
          style={{ opacity }}
        >
          <p className="flex items-center gap-3 text-2xl font-bold tracking-tight text-fg">
            <AtlasBadge markSize={28} className="size-12" />
            Atlas
          </p>
          <h1 className="isolate pb-[0.14em] text-poster text-fg [font-size:min(9.5vw,14.5vh)] max-sm:[font-size:11.5vw]">
            Czytaj mniej.
            <br />
            <span className="mt-[0.1em] inline-block">
              <Marked
                ink="cobalt"
                frame={{
                  initial: { scaleX: 0 },
                  animate: { scaleX: 1 },
                  transition: { ...move.panel, delay: MARK_DELAY },
                }}
              >
                Zobacz więcej.
              </Marked>
            </span>
          </h1>
          <p className="max-w-[54rem] text-lg text-balance text-fg-soft sm:text-xl">
            Atlas zamienia Twoje artykuły i dokumenty w interaktywną mapę wiedzy i pokazuje na
            jednym grafie powiązania, których nie widać w pojedynczych tekstach.
          </p>
          <AuthLinks />
        </motion.div>
      </div>
    </motion.div>
  )
})
