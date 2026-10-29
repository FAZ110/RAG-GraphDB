import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import {
  Button,
  ConfirmPopover,
  ErrorNote,
  IconButton,
  surface,
  TextInput,
} from '@/components/deck'
import {
  useCustomProviders,
  useDeleteCustomProvider,
  useSaveCustomProvider,
} from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { CustomProvider } from '@/types'

const NEW = 'new'

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
  const providers = useCustomProviders()
  const [editing, setEditing] = useState<string | null>(null)
  const close = () => setEditing(null)
  const list = providers.data ?? []

  return (
    <section className={cn(surface, 'p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-title text-fg">Własne modele językowe</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Dowolny serwer zgodny z API OpenAI, np. Ollama, vLLM albo OpenRouter. Każdy dodany model
            pojawi się jako opcja w ustawieniach zaawansowanych przy dodawaniu artykułów. Klucze API
            są przechowywane w postaci zaszyfrowanej.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={editing === NEW}
          onClick={() => setEditing(NEW)}
        >
          <PlusIcon />
          Dodaj model
        </Button>
      </div>

      {providers.error && <ErrorNote className="mt-4">{providers.error.message}</ErrorNote>}
      {providers.isSuccess && list.length === 0 && editing !== NEW && (
        <p className="mt-5 text-sm text-fg-subtle">Nie dodano jeszcze żadnego modelu.</p>
      )}
      {(list.length > 0 || editing === NEW) && (
        <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft">
          {list.map((p) =>
            editing === p.id ? (
              <ProviderForm key={p.id} saved={p} onDone={close} />
            ) : (
              <ProviderRow key={p.id} provider={p} onEdit={() => setEditing(p.id)} />
            )
          )}
          {editing === NEW && <ProviderForm saved={null} onDone={close} />}
        </ul>
      )}
    </section>
  )
}

function DeleteProviderConfirm({
  provider,
  onDeleted,
  children,
}: {
  provider: CustomProvider
  onDeleted?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteCustomProvider()

  return (
    <ConfirmPopover
      open={open}
      onOpenChange={(next) => {
        remove.reset()
        setOpen(next)
      }}
      question={`Usunąć model „${provider.name}”?`}
      detail="Artykuły przetworzone tym modelem zostają, ale ich ponowienie wymaga wyboru innego."
      error={remove.error?.message ?? null}
      pending={remove.isPending}
      onConfirm={() => remove.mutate(provider.id, { onSuccess: onDeleted })}
    >
      {children}
    </ConfirmPopover>
  )
}

function ProviderRow({ provider, onEdit }: { provider: CustomProvider; onEdit: () => void }) {
  const key = provider.has_api_key
    ? `klucz ${provider.api_key_hint ? `…${provider.api_key_hint}` : 'zapisany'}`
    : 'bez klucza'

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{provider.name}</p>
        <p className="truncate text-sm text-fg-subtle">
          {provider.model} · {provider.base_url} · {key}
        </p>
      </div>
      <IconButton variant="secondary" label={`Edytuj ${provider.name}`} onClick={onEdit}>
        <PencilIcon />
      </IconButton>
      <DeleteProviderConfirm provider={provider}>
        <IconButton variant="danger-outline" label={`Usuń ${provider.name}`}>
          <Trash2Icon />
        </IconButton>
      </DeleteProviderConfirm>
    </li>
  )
}

function ProviderForm({ saved, onDone }: { saved: CustomProvider | null; onDone: () => void }) {
  const [name, setName] = useState(saved?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(saved?.base_url ?? '')
  const [model, setModel] = useState(saved?.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const save = useSaveCustomProvider(saved?.id ?? null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { name, base_url: baseUrl, model, api_key: apiKey.trim() || null },
      { onSuccess: onDone }
    )
  }

  return (
    <li className="py-3">
      <form
        onSubmit={submit}
        aria-label={saved ? `Edycja modelu ${saved.name}` : 'Nowy model'}
        className="grid gap-3 border border-line bg-surface-sunken p-4 sm:grid-cols-2"
      >
        <Field label="Nazwa" hint="Tak będzie widoczny na liście modeli.">
          <TextInput required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
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
        {save.error && (
          <div className="sm:col-span-2">
            <ErrorNote>{save.error.message}</ErrorNote>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2">
          <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
            {save.isPending ? 'Zapisuję…' : 'Zapisz'}
          </Button>
          {saved && (
            <Button variant="secondary" size="sm" onClick={onDone}>
              Anuluj
            </Button>
          )}
          <span className="ml-auto">
            {saved ? (
              <DeleteProviderConfirm provider={saved} onDeleted={onDone}>
                <Button variant="danger-outline" size="sm">
                  <Trash2Icon />
                  Usuń
                </Button>
              </DeleteProviderConfirm>
            ) : (
              <Button variant="danger-outline" size="sm" onClick={onDone}>
                <Trash2Icon />
                Usuń
              </Button>
            )}
          </span>
        </div>
      </form>
    </li>
  )
}
