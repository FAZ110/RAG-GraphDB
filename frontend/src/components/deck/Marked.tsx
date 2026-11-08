import { motion } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'

interface Props {
  ink: string
  children: ReactNode
  /** Decides how the frame opens. */
  frame: ComponentProps<typeof motion.span>
}

/** Poster words marked the way an entity is marked on the page. */
export function Marked({ ink, children, frame }: Props) {
  const color = `var(--ink-${ink})`
  return (
    <span
      className="relative inline-block px-[0.16em] pt-[0.1em] pb-[0.26em] leading-none whitespace-nowrap"
      style={{ color }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left border-[0.03em] shadow-[0.05em_0.05em_0_var(--marked-ink)]"
        {...frame}
        style={{
          ...frame.style,
          borderColor: color,
          backgroundColor: `var(--ink-${ink}-field)`,
          ['--marked-ink' as string]: color,
        }}
      />
      {children}
    </span>
  )
}
