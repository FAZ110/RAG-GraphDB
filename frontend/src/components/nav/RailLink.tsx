import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Flyout } from './Flyout'
import { pressable } from './navItems'

interface Props extends ComponentProps<typeof Link> {
  label: string
  active: boolean
  icon: ReactNode
}

export function RailLink({ label, active, icon, className, children, ...props }: Props) {
  return (
    <Link
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={pressable(active, 'icon', className)}
      {...props}
    >
      {icon}
      {children}
      <Flyout>{label}</Flyout>
    </Link>
  )
}
