import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'motion/react'
import type { HTMLMotionProps } from 'motion/react'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing, surface } from './styles'

interface Props extends Omit<ComponentProps<'input'>, 'size' | 'type'> {
  size?: 'md' | 'lg'
  /** Hidden once the field is narrower than 17rem. */
  status?: string
  action?: ReactNode
  frame?: HTMLMotionProps<'label'>
  inputClassName?: string
}

export function SearchField({
  size = 'lg',
  status,
  action,
  frame,
  className,
  inputClassName,
  ...props
}: Props) {
  return (
    <motion.label
      {...frame}
      className={cn(
        surface,
        '@container flex min-w-0 cursor-text items-center gap-2 px-3 focus-within:border-fg',
        size === 'lg' ? 'h-12' : 'h-10',
        className
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
      <input
        type="search"
        className={cn(
          'min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-faint [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'text-base font-medium placeholder:font-normal' : 'text-sm',
          inputClassName
        )}
        {...props}
      />
      {status && (
        <span
          className="hidden shrink-0 text-xs text-fg-subtle tabular-nums @[17rem]:inline"
          aria-live="polite"
        >
          {status}
        </span>
      )}
      {action}
    </motion.label>
  )
}

export function SearchFieldButton({
  label,
  children,
  ...props
}: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn('-mr-1 shrink-0 p-1 text-fg-faint hover:text-fg', focusRing)}
      {...props}
    >
      {children}
    </button>
  )
}
