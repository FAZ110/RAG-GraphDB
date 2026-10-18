import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Select } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { PROVIDERS } from '@/lib/providers'
import type { Provider } from '@/lib/providers'
import { cn } from '@/lib/utils'

interface Props {
  value: Provider
  onChange: (provider: Provider) => void
  ink: Ink
}

export function ProviderSettings({ value, onChange, ink }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mr-auto flex min-w-0 flex-wrap items-center gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg"
      >
        Ustawienia zaawansowane
        <ChevronDownIcon className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <span aria-hidden="true">Model językowy</span>
          <Select
            label="Model językowy"
            options={PROVIDERS.map((p) => ({
              value: p.value,
              label: p.label,
              hint: p.paid ? `${p.model}, płatny` : p.model,
            }))}
            value={value}
            onChange={onChange}
            ink={ink}
            className="w-40"
          />
        </div>
      )}
    </div>
  )
}
