import { useState } from 'react'
import type { FormEvent } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { Button, ErrorNote, IconButton, Modal, TextInput } from '@/components/deck'
import { useExtractionSettings, useSaveExtractionSettings } from '@/hooks/useSpaces'
import { toIdentifier } from '@/lib/text'
import type { ExtractionSettings } from '@/types'

const fieldLabel = 'block text-xs font-medium text-fg-muted'

const splitLabels = (value: string) => value.split(',').map(toIdentifier).filter(Boolean)

export function ExtractionSettingsButton({ spaceId }: { spaceId: string }) {
  const [open, setOpen] = useState(false)
  const settings = useExtractionSettings(spaceId)

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
        className="inset-x-3 top-[12vh] mx-auto max-w-lg p-6"
      >
        <h2 className="mb-1 text-title text-fg">Ustawienia ekstrakcji</h2>
        <p className="mb-4 text-sm text-fg-subtle">
          Dotyczą kolejnych ekstrakcji w tej przestrzeni. Wyodrębnione już artykuły zmienią się
          dopiero po ponownym przetworzeniu.
        </p>
        {settings.error && <ErrorNote>{settings.error.message}</ErrorNote>}
        {open && settings.data && (
          <SettingsForm spaceId={spaceId} saved={settings.data} onDone={() => setOpen(false)} />
        )}
      </Modal>
    </>
  )
}

function SettingsForm({
  spaceId,
  saved,
  onDone,
}: {
  spaceId: string
  saved: ExtractionSettings
  onDone: () => void
}) {
  const [rules, setRules] = useState(saved.rules)
  const [labels, setLabels] = useState(saved.labels.join(', '))
  const save = useSaveExtractionSettings(spaceId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const parsed = splitLabels(labels)
    save.mutate(
      { rules: rules.trim() || null, labels: parsed.length ? parsed : null },
      { onSuccess: onDone }
    )
  }

  const reset = () => save.mutate({ rules: null, labels: null }, { onSuccess: onDone })

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className={fieldLabel}>
        Dodatkowe reguły (opcjonalnie)
        <textarea
          autoFocus
          rows={5}
          placeholder="np. Pomijaj kibiców i dziennikarzy. Wyodrębniaj tylko kluby, zawodników i mecze."
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="mt-1 w-full border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-fg"
        />
        <span className="mt-1 block font-normal text-fg-subtle">
          Uzupełniają stały prompt ekstrakcji, np. czego szukać, a co pomijać.
        </span>
      </label>
      <label className={fieldLabel}>
        Bazowe etykiety (po przecinku)
        <TextInput className="mt-1" value={labels} onChange={(e) => setLabels(e.target.value)} />
        <span className="mt-1 block font-normal text-fg-subtle">
          Podpowiedź dla modelu: gdy żadna nie pasuje do bytu, dobierze inną.
        </span>
      </label>
      {save.error && <ErrorNote>{save.error.message}</ErrorNote>}
      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="mr-auto"
          disabled={save.isPending}
          onClick={reset}
        >
          Przywróć domyślne
        </Button>
        <Button variant="secondary" size="sm" onClick={onDone}>
          Anuluj
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Zapisuję…' : 'Zapisz'}
        </Button>
      </div>
    </form>
  )
}
