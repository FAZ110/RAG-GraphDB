import { memo } from 'react'
import type { MotionValue } from 'motion/react'
import { Caption } from './Caption'
import { Inspector } from './Inspector'
import { CHAPTERS } from './timeline'
import { World } from './world/World'

interface Props {
  progress: MotionValue<number>
  heading: MotionValue<number>
}

export const Story = memo(function Story({ progress, heading }: Props) {
  return (
    <div className="absolute inset-0 mx-auto flex max-w-[100rem] flex-col justify-center gap-4 px-4 pt-20 pb-10 sm:px-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-1 lg:gap-8 lg:px-12 lg:pt-16 lg:pb-8">
      {/* On a phone the drawing and its words sit together mid-screen; the words get room for
          the longest chapter, since they all share the same place. */}
      <div className="relative order-2 h-52 shrink-0 lg:order-1 lg:h-auto lg:min-h-0">
        {CHAPTERS.map((chapter) => (
          <Caption key={chapter.step} chapter={chapter} progress={progress} heading={heading} />
        ))}
      </div>
      <div className="relative order-1 mx-auto aspect-square w-[min(100%,calc(100dvh-25rem))] shrink-0 lg:order-2 lg:mx-0 lg:aspect-auto lg:w-auto lg:min-h-0">
        <World progress={progress} />
        <Inspector progress={progress} />
      </div>
    </div>
  )
})
