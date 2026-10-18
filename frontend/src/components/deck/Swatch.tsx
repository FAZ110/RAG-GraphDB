import { cn } from '@/lib/utils'

interface Props {
  color: string
  label?: string
  className?: string
}

export function Swatch({ color, label, className }: Props) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className={cn('size-2.5 shrink-0', className)}
      style={{ backgroundColor: color }}
    />
  )
}
