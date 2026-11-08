import { LoaderCircleIcon, SaveCheckIcon, SaveIcon, SaveOffIcon, SavePenIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconSwap, Tooltip, focusRing } from '@/components/deck'
import { cn } from '@/lib/utils'
import type { SaveStatus as Status } from '../state/useAutosave'
import { savedAtText } from './savedAt'

const ICONS: Record<Status, ReactNode> = {
  draft: <SaveIcon />,
  saved: <SaveCheckIcon />,
  saving: <LoaderCircleIcon className="animate-spin" />,
  unsaved: <SavePenIcon />,
  error: <SaveOffIcon />,
  conflict: <SaveOffIcon />,
}

// A status light on the icon, so the state reads from its colour at a glance.
const LIGHTS: Record<Status, string | null> = {
  draft: null,
  saved: 'bg-status-ok',
  saving: 'bg-status-processing animate-pulse',
  unsaved: 'bg-[var(--ink-ochre)]',
  error: 'bg-status-error',
  conflict: 'bg-status-error',
}

const TITLES: Record<Status, string> = {
  draft: 'Jeszcze niezapisana',
  saved: 'Zapisano',
  saving: 'Zapisuję…',
  unsaved: 'Zapiszę za chwilę',
  error: 'Nie udało się zapisać',
  conflict: 'Zmieniona w innej karcie',
}

interface Props {
  status: Status
  savedAt: string | null
  error: string | null
  onRetry: () => void
  onReload: () => void
}

// Rendered as the tooltip opens, so "minutes ago" counts from then.
function SavedAt({ iso }: { iso: string }) {
  return <>Ostatni zapis: {savedAtText(iso)}</>
}

/** Whether the canvas is saved, as an icon; the time of the last save sits in its tooltip. */
export function SaveStatus({ status, savedAt, error, onRetry, onReload }: Props) {
  const failed = status === 'error' || status === 'conflict'
  const detail =
    status === 'draft'
      ? 'Zapisze się po dodaniu pierwszej encji'
      : failed
        ? error
        : savedAt && <SavedAt iso={savedAt} />

  return (
    <span className="flex items-center gap-1">
      <Tooltip
        content={
          <>
            <span className="block font-semibold">{TITLES[status]}</span>
            {detail && <span className="block text-fg-inverse-muted">{detail}</span>}
          </>
        }
        side="bottom"
      >
        <span
          tabIndex={0}
          role="status"
          aria-label={TITLES[status]}
          className={cn(
            'flex size-8 items-center justify-center [&_svg]:size-4',
            failed ? 'text-danger' : status === 'draft' ? 'text-fg-faint' : 'text-fg-muted',
            focusRing
          )}
        >
          <span className="relative flex">
            <IconSwap id={status}>{ICONS[status]}</IconSwap>
            {LIGHTS[status] && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -right-1 -bottom-0.5 size-2 rounded-full ring-2 ring-surface transition-colors',
                  LIGHTS[status]
                )}
              />
            )}
          </span>
        </span>
      </Tooltip>
      {/* Something to do about it stays in view, not only in the tooltip. */}
      {failed && (
        <button
          type="button"
          onClick={status === 'conflict' ? onReload : onRetry}
          className={cn(
            'px-1 text-xs font-semibold text-danger underline underline-offset-2',
            focusRing
          )}
        >
          {status === 'conflict' ? 'Wczytaj ponownie' : 'Spróbuj ponownie'}
        </button>
      )}
    </span>
  )
}
