import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 border text-sm font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'deck-press border-fg bg-fg text-fg-inverse hover:bg-fg-hover focus-visible:ring-fg focus-visible:ring-offset-2 disabled:border-line disabled:bg-line',
        secondary:
          'deck-press border-line bg-surface text-fg-soft [--deck-shadow:var(--line)] hover:border-fg hover:text-fg focus-visible:ring-fg disabled:opacity-60',
        danger:
          'deck-press border-danger bg-danger text-fg-inverse [--deck-shadow:var(--danger-fg)] hover:bg-danger-strong focus-visible:ring-danger focus-visible:ring-offset-2 disabled:opacity-60',
        'danger-soft':
          'border-danger-line bg-danger-surface text-danger hover:bg-danger-surface-strong focus-visible:ring-danger',
        'danger-outline':
          'deck-press border-line bg-surface text-danger/80 [--deck-shadow:var(--line)] hover:border-danger-line hover:bg-danger-surface hover:text-danger focus-visible:ring-danger',
        ghost: 'border-transparent text-fg-muted hover:text-fg focus-visible:ring-fg',
        'ghost-danger':
          'border-transparent text-danger-strong hover:bg-danger-surface-strong focus-visible:ring-danger',
        remove:
          'border-transparent text-fg-faint hover:bg-danger-surface hover:text-danger focus-visible:ring-danger disabled:pointer-events-none disabled:opacity-40',
        inverse:
          'deck-press border-fg-inverse bg-fg-inverse text-fg hover:bg-surface-sunken focus-visible:ring-fg-inverse focus-visible:ring-offset-2 focus-visible:ring-offset-surface-inverse',
        'inverse-outline':
          'border-fg-muted text-fg-inverse-muted hover:border-fg-faint hover:text-fg-inverse focus-visible:ring-fg-inverse disabled:opacity-50',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-4',
        xl: 'h-11 px-5',
        'icon-sm': 'size-8',
        'icon-md': 'size-9',
        'icon-lg': 'size-10',
        'icon-xl': 'size-11',
        'icon-2xl': "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { variant: 'secondary', size: 'lg' },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
