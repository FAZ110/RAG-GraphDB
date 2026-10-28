import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button, ErrorNote, surface, TextInput } from '@/components/deck'
import {
  useCustomProvider,
  useDeleteCustomProvider,
  useSaveCustomProvider,
} from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { CustomProvider } from '@/types'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-fg-muted">
      {label}
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block font-normal text-fg-subtle">{hint}</span>}
    </label>
  )
}

export function CustomProviderSection() {
  const provider = useCustomProvider()

  return (
    <section className={cn(surface, 'p-6')}>
      <h2 className="text-title text-fg">Własny model językowy</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-fg-subtle">
        Dowolny serwer zgodny z API OpenAI, np. Ollama, vLLM albo OpenRouter. Po zapisaniu pojawi
        się jako kolejna opcja w ustawieniach zaawansowanych przy dodawaniu artykułów.
      </p>
      {provider.error && <ErrorNote>{provider.error.message}</ErrorNote>}
      {provider.isSuccess && (
        <ProviderForm key={JSON.stringify(provider.data)} saved={provider.data} />
      )}
    </section>
  )
}

function ProviderForm({ saved }: { saved: CustomProvider | null }) {
  const [name, setName] = useState(saved?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(saved?.base_url ?? '')
  const [model, setModel] = useState(saved?.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const save = useSaveCustomProvider()
  const remove = useDeleteCustomProvider()
  const error = save.error ?? remove.error

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ name, base_url: baseUrl, model, api_key: apiKey.trim() || null })
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-3 sm:grid-cols-2">
      <Field label="Nazwa" hint="Tak będzie widoczny na liście modeli.">
        <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Model">
        <TextInput
          required
          placeholder="np. qwen2.5:14b"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Adres API">
          <TextInput
            required
            type="url"
            placeholder="http://127.0.0.1:11434/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field
          label="Klucz API"
          hint={
            saved?.has_api_key
              ? 'Klucz jest zapisany. Zostaw puste, by go nie zmieniać.'
              : 'Opcjonalny: serwery lokalne zwykle go nie wymagają.'
          }
        >
          <TextInput
            type="password"
            autoComplete="off"
            placeholder={saved?.has_api_key ? '••••••••' : ''}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <div className="sm:col-span-2">
          <ErrorNote>{error.message}</ErrorNote>
        </div>
      )}
      <div className="flex gap-2 pt-1 sm:col-span-2">
        <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Zapisuję…' : 'Zapisz'}
        </Button>
        {saved && (
          <Button
            variant="danger-outline"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Usuń
          </Button>
        )}
      </div>
    </form>
  )
}
