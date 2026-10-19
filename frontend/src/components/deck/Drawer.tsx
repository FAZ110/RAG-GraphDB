import type { ComponentProps } from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function DrawerContent({
  side = 'right',
  className,
  ...props
}: ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      side={side}
      className={cn(
        'w-full rounded-none border-line bg-surface shadow-none',
        side === 'right'
          ? '[box-shadow:calc(var(--deck-offset-lg)*-1)_0_0_var(--line)] data-[side=right]:w-full'
          : '[box-shadow:var(--deck-offset-lg)_0_0_var(--line)] data-[side=left]:w-full',
        className
      )}
      {...props}
    />
  )
}

// From the primitive: shadcn's own cn doesn't know the custom text sizes and would drop them.
export function DrawerTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('font-semibold text-fg', className)} {...props} />
}

export function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description className={cn('text-sm text-fg-subtle', className)} {...props} />
  )
}

export {
  Sheet as Drawer,
  SheetHeader as DrawerHeader,
  SheetTrigger as DrawerTrigger,
} from '@/components/ui/sheet'
