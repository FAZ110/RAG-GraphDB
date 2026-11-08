import { motion } from 'motion/react'
import { LandingNav } from './LandingNav'
import { Capabilities } from './sections/capabilities/Capabilities'
import { FinalCall } from './sections/FinalCall'
import { Manual } from './sections/manual/Manual'
import { Backdrop } from './story/Backdrop'
import { Hero } from './story/Hero'
import { Story } from './story/Story'
import { LAST_STEP } from './story/timeline'
import { useSteps } from './useSteps'

const SCENES = Array.from({ length: LAST_STEP + 1 }, (_, i) => i)

export function LandingPage() {
  const { step, progress, heading, stage, goTo, scroller } = useSteps(LAST_STEP)
  return (
    <div
      ref={scroller}
      className="fixed inset-0 snap-y snap-mandatory overflow-x-hidden overflow-y-scroll overscroll-none bg-page [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
          {SCENES.map((scene) => (
            <div key={scene} className="h-dvh snap-start snap-always" />
          ))}
        </div>
        <div className="sticky top-0 h-dvh overflow-clip">
          <LandingNav step={step} goTo={goTo} />
          <motion.main className="will-change-[opacity]" style={{ opacity: stage }}>
            <Backdrop progress={progress} />
            <Hero progress={progress} />
            <Story progress={progress} heading={heading} />
            <Capabilities progress={progress} step={step} />
            <Manual progress={progress} step={step} />
            <FinalCall progress={progress} />
          </motion.main>
        </div>
        <div aria-hidden="true" style={{ height: `${LAST_STEP * 100}dvh` }} />
      </div>
    </div>
  )
}
