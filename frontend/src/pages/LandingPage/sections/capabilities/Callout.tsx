import { motion, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { cn } from '@/lib/utils'
import { Haze } from '../../story/Haze'
import { WINDOW } from './items'
import type { CapabilityItem } from './items'

interface Props {
  item: CapabilityItem
  t: MotionValue<number>
}

/** A line drawn out of the window from the part it names, then the words at its end. */
export function Callout({ item, t }: Props) {
  const left = item.side === 'left'
  const scaleX = useTransform(t, [0, 0.55], [0, 1])
  const opacity = useTransform(t, [0.35, 1], [0, 1])
  return (
    <div
      className={cn(
        'absolute inset-x-0 flex -translate-y-1/2 items-center gap-4',
        left ? 'flex-row' : 'flex-row-reverse'
      )}
      style={{ top: `${(item.at / WINDOW.height) * 100}%` }}
    >
      <div
        className={cn(
          'relative w-[min(14.5rem,calc(100%-5rem))] shrink-0',
          left ? 'text-right' : 'text-left'
        )}
      >
        <Haze opacity={opacity} />
        <motion.div style={{ opacity }}>
          <p className="text-lg leading-tight font-semibold">{item.title}</p>
          <p className="mt-1 text-sm text-fg-soft xl:text-[0.95rem]">{item.body}</p>
        </motion.div>
      </div>
      <motion.span
        aria-hidden="true"
        className={cn('relative h-0.5 flex-1 bg-fg', left ? 'origin-right' : 'origin-left')}
        style={{ scaleX }}
      >
        <span
          className={cn(
            'absolute top-1/2 size-2 -translate-y-1/2 bg-fg',
            left ? '-right-1' : '-left-1'
          )}
        />
      </motion.span>
    </div>
  )
}

/** The same words without the line, for a screen too narrow to set them beside the window. */
export function CalloutText({ item, t }: Props) {
  const opacity = useTransform(t, [0.35, 1], [0, 1])
  return (
    <li className="relative">
      <Haze opacity={opacity} />
      <motion.div style={{ opacity }}>
        <p className="text-base leading-tight font-semibold sm:text-lg">{item.title}</p>
        <p className="mt-1 text-sm text-fg-soft">{item.body}</p>
      </motion.div>
    </li>
  )
}
