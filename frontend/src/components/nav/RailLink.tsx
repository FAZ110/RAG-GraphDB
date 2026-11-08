import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'
import { Flyout } from './Flyout'
import { activeFill, pressable } from './navItems'

interface Props extends ComponentProps<typeof Link> {
  label: string
  active: boolean
  icon: ReactNode
  group?: string
}

export function RailLink({
  label,
  active,
  icon,
  group = 'main',
  className,
  children,
  ...props
}: Props) {
  return (
    <Link
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={pressable(active, 'icon', className, true)}
      {...props}
    >
      {/* One highlight for the group, sliding to the place you go. */}
      {active && (
        <motion.span
          layoutId={`rail-active-${group}`}
          className={cn('absolute inset-0', activeFill)}
          transition={move.quick}
        />
      )}
      <span className="relative flex">{icon}</span>
      {children}
      <Flyout>{label}</Flyout>
    </Link>
  )
}
