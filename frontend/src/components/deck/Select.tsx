import type { CSSProperties } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Select as Primitive } from 'radix-ui'
import type { Ink } from '@/design/inks'
import { cn } from '@/lib/utils'
import { focusRing } from './styles'

export interface SelectOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface Props<T extends string> {
  label: string
  options: readonly SelectOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
  placeholder?: string
  size?: 'md' | 'lg'
  /** Matches the list to the surface it opens over, e.g. a modal in a space's ink. */
  ink?: Ink
  className?: string
}

const sizes = { md: 'h-9 text-sm', lg: 'h-10 text-base font-semibold' }

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  size = 'md',
  ink,
  className,
}: Props<T>) {
  const inked = {
    '--deck-shadow': ink?.color ?? 'var(--fg-subtle)',
    '--select-field': ink?.field ?? 'var(--surface-sunken)',
    '--select-ink': ink?.color ?? 'var(--fg)',
  } as CSSProperties

  return (
    <Primitive.Root
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={options.length === 0}
    >
      <Primitive.Trigger
        aria-label={label}
        className={cn(
          'flex min-w-0 items-center gap-3 border border-line bg-surface px-3 text-left text-fg transition-colors hover:border-fg data-[state=open]:border-fg',
          sizes[size],
          focusRing,
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <Primitive.Value placeholder={placeholder} />
        </span>
        <Primitive.Icon asChild>
          <ChevronDownIcon className="size-4 shrink-0 text-fg-subtle" />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          style={inked}
          className="deck z-60 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) border border-fg bg-surface"
        >
          <Primitive.Viewport className="p-1.5">
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-default items-center gap-3 px-2.5 py-2 outline-none select-none data-highlighted:bg-(--select-field)"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">
                    <Primitive.ItemText>{option.label}</Primitive.ItemText>
                  </span>
                  {option.hint && (
                    <span className="block text-xs text-fg-subtle">{option.hint}</span>
                  )}
                </span>
                <Primitive.ItemIndicator>
                  <CheckIcon className="size-4 text-(--select-ink)" />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
