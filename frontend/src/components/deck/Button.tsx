import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from './buttonVariants'
import type { ButtonVariantProps } from './buttonVariants'

export interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  asChild?: boolean
}

export function Button({ variant, size, asChild = false, className, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
