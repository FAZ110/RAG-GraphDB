import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
}

export function Checkbox({ indeterminate = false, className, ...props }: Props) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = indeterminate
      }}
      className={cn(
        'size-4 cursor-pointer accent-fg focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30',
        className
      )}
      {...props}
    />
  )
}
