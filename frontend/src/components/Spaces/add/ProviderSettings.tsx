import { ChevronDownIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/components/auth/authContext'
import { focusRing, Select } from '@/components/deck'
import type { Ink } from '@/design/inks'
import { move } from '@/design/motion'
import { useCustomProviders } from '@/hooks/useSettings'
import { customProvider, PROVIDERS } from '@/lib/providers'
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
  const custom = useCustomProviders().data ?? []
  const { user } = useAuth()
  const options = [
    // LM Studio runs on the developer's machine, so a built app has no local model to reach.
    ...(user.server_models
      ? PROVIDERS.filter((p) => import.meta.env.DEV || p.value !== 'local')
      : []
    ).map((p) => ({
      value: p.value as Provider,
      label: p.label,
      hint: p.paid ? `${p.model}, płatny` : p.model,
    })),
    ...custom.map((p) => ({ value: customProvider(p.id), label: p.name, hint: p.model })),
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
        {options.length > 0 && (
          <Select
            label="Model językowy"
            options={options}
            value={value}
            onChange={onChange}
            ink={ink}
            className="w-48 min-w-0"
          />
        )}
        {!user.server_models && (
          <p className="min-w-0 text-xs text-fg-subtle">
            Nie masz dostępu do modeli serwera, może go włączyć administrator.{' '}
            {options.length > 0
              ? 'Możesz korzystać z własnych modeli.'
              : 'Dodaj własny model w Ustawieniach, aby przetwarzać artykuły.'}
          </p>
        )}
      </div>
    </motion.div>
  )
}
