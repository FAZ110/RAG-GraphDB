import { ChevronDownIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { focusRing, Select } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { move } from '@/design/motion'
import { useCustomProvider } from '@/hooks/useSettings'
import { CUSTOM_PROVIDER, PROVIDERS } from '@/lib/providers'
import type { Provider } from '@/lib/providers'
import { cn } from '@/lib/utils'

export function ProviderSettingsToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        'mr-auto flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg',
        focusRing
      )}
    >
      Ustawienia zaawansowane
      <ChevronDownIcon
        className={cn('size-4 transition-transform spring-quick', open && 'rotate-180')}
      />
    </button>
  )
}

interface Props {
  value: Provider
  onChange: (provider: Provider) => void
  ink: Ink
}

export const SETTINGS_HEIGHT = 61

export function ProviderSettings({ value, onChange, ink }: Props) {
  const custom = useCustomProvider().data
  const options = [
    ...PROVIDERS.map((p) => ({
      value: p.value as Provider,
      label: p.label,
      hint: p.paid ? `${p.model}, płatny` : p.model,
    })),
    ...(custom
      ? [{ value: CUSTOM_PROVIDER as Provider, label: custom.name, hint: custom.model }]
      : []),
  ]

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: SETTINGS_HEIGHT }}
      exit={{ height: 0 }}
      // The modal's own height transition, both ways.
      transition={move.panel}
      className="shrink-0 overflow-hidden"
    >
      <div
        style={{ height: SETTINGS_HEIGHT }}
        className="flex items-center gap-4 border-t border-line-soft bg-surface-sunken px-6 sm:px-8"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-xs font-semibold tracking-wide text-fg-subtle uppercase"
        >
          Model językowy
        </span>
        <Select
          label="Model językowy"
          options={options}
          value={value}
          onChange={onChange}
          ink={ink}
          className="w-48 min-w-0"
        />
      </div>
    </motion.div>
  )
}
