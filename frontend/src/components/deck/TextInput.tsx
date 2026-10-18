import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<ComponentProps<'input'>, 'size'> {
  size?: 'md' | 'display'
}

export function TextInput({ size = 'md', className, ...props }: Props) {
  return (
    <input
      className={cn(
        'w-full min-w-0 border border-line bg-surface px-3 text-fg outline-none placeholder:font-normal placeholder:text-fg-faint focus-visible:border-fg disabled:opacity-60',
        size === 'md' ? 'h-9 text-base md:text-sm' : 'h-12 text-display',
        className
      )}
      {...props}
    />
  )
}
