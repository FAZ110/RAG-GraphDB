import { focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors spring-quick disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-fg bg-fg' : 'border-line bg-surface-sunken',
        focusRing
      )}
    >
      <span
        className={cn(
          'absolute size-4 transition-transform spring-quick',
          checked ? 'translate-x-6 bg-fg-inverse' : 'translate-x-1 bg-fg-faint'
        )}
      />
    </button>
  )
}
