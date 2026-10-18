import { motion } from 'motion/react'
import { inkFor } from '@/design/inks'
import { enter } from '@/design/motion'
import type { Space } from '@/types'
import { SpaceArticles } from './articles/SpaceArticles'
import { SpaceHeader } from './header/SpaceHeader'

export function SpacePanel({ space }: { space: Space }) {
  const ink = inkFor(space.id)

  return (
    <motion.section {...enter} aria-label={space.name} className="flex h-full flex-col gap-6">
      <div className="shrink-0">
        <SpaceHeader space={space} ink={ink} />
      </div>
      <SpaceArticles spaceId={space.id} ink={ink} />
    </motion.section>
  )
}
