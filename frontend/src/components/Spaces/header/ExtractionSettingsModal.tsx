import { useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { SlidersHorizontalIcon, XIcon } from 'lucide-react'
import { Switch } from '@/components/admin/Switch'
import { Button, ErrorNote, IconButton, Modal, Select } from '@/components/deck'
import { inkFor } from '@/design/inks'
import type { Ink } from '@/design/inks'
import { useExtractionSettings, useSaveExtractionSettings } from '@/hooks/useSpaces'
import type { ExtractionSettings } from '@/types'
import { previewPrompt, splitLabels } from './extractionPreview'

const sectionTitle = 'font-semibold text-fg'
const fieldLabel = 'text-sm text-fg-muted'

// The parts of the prompt that follow the form, in the space's ink.
const changing = 'border-b-2 border-(--ink) bg-(--ink-field) text-fg'

export function ExtractionSettingsButton({ spaceId }: { spaceId: string }) {
  const [open, setOpen] = useState(false)
  const settings = useExtractionSettings(spaceId)
  const ink = inkFor(spaceId)

  return (
    <>
      <IconButton
        type="button"
        variant="secondary"
        label="Ustawienia ekstrakcji"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontalIcon />
      </IconButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Ustawienia ekstrakcji"
        style={
          {
            '--deck-shadow': ink.color,
            '--ink': ink.color,
            '--ink-field': ink.field,
          } as CSSProperties
        }
        focusFirst={false}
        className="inset-0 m-auto h-[min(52rem,calc(100dvh-1.5rem))] w-[min(76rem,calc(100vw-1.5rem))] overflow-hidden sm:h-[min(52rem,calc(100dvh-4rem))] sm:w-[min(76rem,calc(100vw-4rem))]"
      >
        <header className="flex items-start gap-3 border-b border-line-soft px-6 py-4 sm:px-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-heading text-fg">Ustawienia ekstrakcji</h2>
            <p className="text-sm text-fg-subtle">
              Dotyczą kolejnych ekstrakcji w tej przestrzeni. Wyodrębnione już artykuły zmienią się
              dopiero po ponownym przetworzeniu.
            </p>
          </div>
          <IconButton
            variant="ghost"
            label="Zamknij"
            className="mt-0.5 shrink-0 [--deck-shadow:var(--fg-subtle)]"
            onClick={() => setOpen(false)}
          >
            <XIcon />
          </IconButton>
        </header>
        {settings.error && (
          <div className="p-6 sm:p-8">
            <ErrorNote>{settings.error.message}</ErrorNote>
          </div>
        )}
        {open && settings.data && (
          <SettingsForm
            spaceId={spaceId}
            saved={settings.data}
            ink={ink}
            onDone={() => setOpen(false)}
          />
        )}
      </Modal>
    </>
  )
}

function SettingsForm({
  spaceId,
  saved,
  ink,
  onDone,
}: {
  spaceId: string
  saved: ExtractionSettings
  ink: Ink
  onDone: () => void
}) {
  const [preset, setPreset] = useState(saved.preset)
  const [labels, setLabels] = useState(saved.labels.join(', '))
  const [strict, setStrict] = useState(saved.strict_labels)
  const save = useSaveExtractionSettings(spaceId)

  const modes = [
    { key: null, name: 'Ogólny', description: 'Wszystkie byty i relacje, bez dodatkowych reguł.' },
    ...saved.presets,
  ]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const parsed = splitLabels(labels)
    save.mutate(
      { preset, labels: parsed.length ? parsed : null, strict_labels: strict },
      { onSuccess: onDone }
    )
  }

  const reset = () =>
    save.mutate({ preset: null, labels: null, strict_labels: false }, { onSuccess: onDone })

  const sent = previewPrompt(saved, { preset, labels, strict })

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[29rem_minmax(0,1fr)] lg:overflow-hidden">
        <div className="space-y-6 p-6 sm:p-8 lg:overflow-y-auto">
          <fieldset>
            <legend className={sectionTitle}>Tryb</legend>
            <div className="mt-3 space-y-1.5">
              {modes.map((mode) => (
                <label
                  key={mode.key ?? ''}
                  className="flex cursor-pointer gap-3 border border-line bg-surface px-3.5 py-2.5 transition-colors hover:border-fg has-checked:border-(--ink) has-checked:bg-(--ink-field) has-focus-visible:ring-2 has-focus-visible:ring-fg"
                >
                  <input
                    type="radio"
                    name="preset"
                    className="peer sr-only"
                    checked={preset === mode.key}
                    onChange={() => setPreset(mode.key)}
                  />
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 shrink-0 border border-fg-subtle peer-checked:border-(--ink) peer-checked:bg-(--ink)"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg">{mode.name}</span>
                    <span className="block text-xs text-fg-subtle">{mode.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={sectionTitle}>Etykiety</legend>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5">
              <span className={fieldLabel}>Dziedzina</span>
              <Select
                label="Dziedzina"
                ink={ink}
                placeholder="Własne etykiety"
                options={saved.domains.map((d) => ({
                  value: d.key,
                  label: d.name,
                  hint: d.labels.join(', '),
                }))}
                value={sent.domain}
                onChange={(key) =>
                  setLabels(saved.domains.find((d) => d.key === key)!.labels.join(', '))
                }
              />
              <textarea
                aria-label="Etykiety po przecinku"
                rows={2}
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                // Enter saves, as it did in the one-line field.
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }}
                className="col-span-2 w-full resize-none border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-fg"
              />
            </div>
            <div className="mt-3 flex items-start gap-3 [--deck-shadow:var(--fg-subtle)]">
              <Switch checked={strict} onChange={setStrict} label="Tylko te etykiety" />
              <p className="text-xs text-fg-subtle">
                <span className="block text-sm font-medium text-fg">Tylko te etykiety</span>
                {strict
                  ? 'Byty z inną etykietą są pomijane razem ze swoimi relacjami.'
                  : 'Etykiety są podpowiedzią: gdy żadna nie pasuje do bytu, model dobierze inną.'}
              </p>
            </div>
          </fieldset>
        </div>

        <section
          aria-label="Co trafia do modelu"
          className="flex flex-col gap-5 border-t border-line-soft bg-surface-sunken p-6 sm:p-8 lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          <Sent title="Reguły trybu">
            {sent.scope ? (
              <mark className={changing}>{sent.scope.trim()}</mark>
            ) : (
              <span className="text-fg-subtle">Brak: tryb ogólny wysyła tylko stały prompt.</span>
            )}
          </Sent>
          <Sent title="Cały prompt">
            {sent.beforeRule}
            {strict ? (
              <mark className={changing}>{sent.ruleStart + sent.labels + sent.ruleEnd}</mark>
            ) : (
              <>
                {sent.ruleStart}
                <mark className={changing}>{sent.labels}</mark>
                {sent.ruleEnd}
              </>
            )}
            {sent.beforeScope}
            {sent.scope && <mark className={changing}>{sent.scope}</mark>}
            {sent.afterScope}
          </Sent>
        </section>
      </div>

      {/* Only the modal's own shadow carries the space's ink; its buttons keep the usual one. */}
      <footer className="flex flex-wrap items-center gap-3 border-t border-line-soft px-6 py-4 [--deck-shadow:var(--fg-subtle)] sm:px-8">
        <Button variant="ghost" disabled={save.isPending} onClick={reset}>
          Przywróć domyślne
        </Button>
        {save.error && <ErrorNote inline>{save.error.message}</ErrorNote>}
        <div className="ml-auto flex gap-3">
          <Button onClick={onDone}>Anuluj</Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Zapisuję…' : 'Zapisz ustawienia'}
          </Button>
        </div>
      </footer>
    </form>
  )
}

function Sent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-fg-muted">{title}</h4>
      <pre className="mt-1.5 border border-line bg-surface px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg-soft">
        {children}
      </pre>
    </div>
  )
}
