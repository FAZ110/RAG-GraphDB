import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { CircleHelpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import {
  Button,
  ConfirmPopover,
  ErrorNote,
  IconButton,
  Modal,
  surface,
  TextInput,
} from '@/components/deck'
import {
  useCustomProviders,
  useDeleteCustomProvider,
  useSaveCustomProvider,
  useTestCustomProvider,
} from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { CustomProvider } from '@/types'

const NEW = 'new'

const code = 'border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-fg'

function LocalModelGuide({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Jak dodać model lokalny"
      className="inset-x-3 top-[10vh] mx-auto max-h-[80vh] max-w-xl overflow-y-auto p-6"
    >
      <h2 className="text-title text-fg">Jak dodać model lokalny</h2>
      <p className="mt-1 text-sm text-fg-subtle">
        Artykuły przetwarza nasz serwer, więc nie widzi on adresu localhost na Twoim komputerze.
        Model trzeba udostępnić pod publicznym adresem, np. przez darmowy tunel.
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-fg">
        <li>
          W LM Studio pobierz i załaduj model, a potem w zakładce <b>Developer</b> włącz serwer
          (domyślnie port <code className={code}>1234</code>).
        </li>
        <li>
          W <b>Developer → Server Settings</b> włącz wymaganie uwierzytelnienia i utwórz token API.
          Tunel wystawia serwer do internetu, a bez tokenu każdy, kto zna adres, mógłby korzystać z
          Twojego modelu.
        </li>
        <li>
          Zainstaluj{' '}
          <a
            className="underline"
            href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
            target="_blank"
            rel="noreferrer"
          >
            cloudflared
          </a>{' '}
          i uruchom w terminalu:
          <pre className={cn(code, 'mt-2 block overflow-x-auto py-2')}>
            cloudflared tunnel --url http://127.0.0.1:1234
          </pre>
        </li>
        <li>
          Skopiuj wypisany adres <code className={code}>https://….trycloudflare.com</code>.
        </li>
        <li>
          Kliknij <b>Dodaj model</b>. Jako adres API wpisz skopiowany adres z dopiskiem{' '}
          <code className={code}>/v1</code>, jako model — nazwę Twojego modelu lokalnego, a jako
          klucz API — token z LM Studio. <b>Równoległe zapytania</b> zostaw na{' '}
          <code className={code}>1</code> i kliknij <b>Sprawdź połączenie</b>.
        </li>
      </ol>
      <h3 className="mt-5 text-sm font-semibold text-fg">Wskazówki</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-fg">
        <li>
          Przy ładowaniu modelu ustaw <b>Context Length</b> na co najmniej{' '}
          <code className={code}>8192</code>, a <b>Max Concurrent Predictions</b> na{' '}
          <code className={code}>1</code>. Przy braku pamięci GPU zmniejsz <b>GPU Offload</b>.
        </li>
        <li>
          Wybieraj modele bez „myślenia” (np. Llama 3.1 Instruct). Modele rozumujące działają, ale
          zużywają kontekst i czas na samo myślenie.
        </li>
        <li>
          Jeden artykuł musi zostać przetworzony w ciągu 10 minut. Przy wolnym sprzęcie dziel długie
          teksty na krótsze artykuły.
        </li>
      </ul>
      <p className="mt-4 text-xs text-fg-subtle">
        Tunel i komputer muszą działać przez cały czas przetwarzania artykułów. Po ponownym
        uruchomieniu tunelu adres się zmienia — zaktualizuj go wtedy w ustawieniach modelu.
      </p>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
          Rozumiem
        </Button>
      </div>
    </Modal>
  )
}

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
  const [guideOpen, setGuideOpen] = useState(false)
  const close = () => setEditing(null)
  const list = providers.data ?? []

  return (
    <section className={cn(surface, 'p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-title text-fg">Własne modele językowe</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Dowolny serwer zgodny z API OpenAI, np. LM Studio, Ollama, vLLM albo OpenRouter — także
            model uruchomiony na Twoim komputerze. Każdy dodany model pojawi się jako opcja w
            ustawieniach zaawansowanych przy dodawaniu artykułów. Klucze API są przechowywane w
            postaci zaszyfrowanej.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={editing === NEW}
            onClick={() => setEditing(NEW)}
          >
            <PlusIcon />
            Dodaj model
          </Button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline focus-visible:underline focus-visible:outline-none"
          >
            <CircleHelpIcon className="size-3.5" />
            Jak dodać model lokalny?
          </button>
        </div>
      </div>
      <LocalModelGuide open={guideOpen} onOpenChange={setGuideOpen} />

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
  const [maxParallel, setMaxParallel] = useState(saved?.max_parallel ?? 1)
  const save = useSaveCustomProvider(saved?.id ?? null)
  const check = useTestCustomProvider()
  const keyRequired = !!saved?.has_api_key && baseUrl.trim() !== saved.base_url

  const testConnection = () =>
    check.mutate({
      base_url: baseUrl,
      model,
      api_key: apiKey.trim() || null,
      provider_id: saved?.id ?? null,
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      { name, base_url: baseUrl, model, api_key: apiKey.trim() || null, max_parallel: maxParallel },
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
          <Field
            label="Adres API"
            hint="Adres musi być publiczny: localhost i sieć prywatna nie są osiągalne z serwera."
          >
            <TextInput
              required
              type="url"
              placeholder="https://twoj-serwer.example/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Klucz API"
            hint={
              keyRequired
                ? 'Adres API się zmienił: podaj klucz ponownie, by nie trafił na inny serwer.'
                : saved?.has_api_key
                  ? 'Klucz jest zapisany. Zostaw puste, by go nie zmieniać.'
                  : 'Opcjonalny: serwer lokalny wymaga go, gdy włączysz w nim uwierzytelnianie.'
            }
          >
            <TextInput
              type="password"
              required={keyRequired}
              autoComplete="off"
              placeholder={saved?.has_api_key ? '••••••••' : ''}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Równoległe zapytania"
            hint="Ile artykułów wysyłać do modelu naraz. Model lokalny: 1. Usługi w chmurze (np. OpenRouter) zwykle przyjmą do 6."
          >
            <TextInput
              required
              type="number"
              min={1}
              max={6}
              className="sm:max-w-32"
              value={maxParallel}
              onChange={(e) => setMaxParallel(Number(e.target.value))}
            />
          </Field>
        </div>
        {(check.data || check.error) && (
          <p
            role="status"
            className={cn(
              'text-sm sm:col-span-2',
              check.data?.ok ? 'text-status-ok' : 'text-danger'
            )}
          >
            {check.data?.message ?? check.error?.message}
          </p>
        )}
        {save.error && (
          <div className="sm:col-span-2">
            <ErrorNote>{save.error.message}</ErrorNote>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2">
          <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
            {save.isPending ? 'Zapisuję…' : 'Zapisz'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={check.isPending || !baseUrl.trim() || !model.trim()}
            onClick={testConnection}
          >
            {check.isPending ? 'Sprawdzam…' : 'Sprawdź połączenie'}
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
