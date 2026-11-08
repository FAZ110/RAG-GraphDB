import { memo } from 'react'
import type { MotionValue } from 'motion/react'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { Dealt } from './Dealt'
import { HeroMark } from './HeroMark'
import { STEP } from './timeline'

const MAP = 'absolute inset-0'

export const Backdrop = memo(function Backdrop({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-page">
      <HeroMark />
      <Dealt progress={progress} step={STEP.wall} className="bg-(--pastel-sky)">
        <ContourBackdrop color="var(--ink-steel)" className={MAP} />
      </Dealt>
      <Dealt progress={progress} step={STEP.graph} className="bg-(--pastel-lilac)">
        <ContourBackdrop color="var(--ink-heather)" className={MAP} />
      </Dealt>
      <Dealt progress={progress} step={STEP.canvas} className="bg-(--pastel-sand)">
        <ContourBackdrop color="var(--ink-ochre)" className={MAP} />
      </Dealt>
    </div>
  )
})
