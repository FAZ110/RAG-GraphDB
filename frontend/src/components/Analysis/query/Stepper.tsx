import { MinusIcon, PlusIcon } from 'lucide-react'
import { focusRing } from '@/components/deck/styles'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  min: number
  max?: number
  label: string
  onChange: (value: number) => void
}

const step = cn(
  'flex size-8 items-center justify-center text-fg-muted hover:bg-surface-sunken hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent',
  focusRing
)

/** A whole number, typed or stepped with − and +. */
export function Stepper({ value, min, max = Infinity, label, onChange }: Props) {
  const set = (n: number) => onChange(Math.min(Math.max(n, min), max))
  return (
    <div className="flex items-center border border-line bg-surface">
      <button
        type="button"
        className={step}
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={`${label}: mniej`}
      >
        <MinusIcon className="size-3.5" />
      </button>
      <input
        type="number"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          set(Number.isNaN(n) ? min : n)
        }}
        aria-label={label}
        className="h-8 w-12 border-x border-line text-center text-sm font-semibold text-fg tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={step}
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={`${label}: więcej`}
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  )
}
