import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EyeIcon, EyeOffIcon, KeyRoundIcon, LockIcon, NetworkIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, ErrorNote, focusRing, TextInput } from '@/components/deck'
import { AtlasMark } from '@/components/nav/AtlasMark'
import { ContourBackdrop } from '@/components/Spaces/map/ContourBackdrop'
import { move } from '@/design/motion'
import { cn } from '@/lib/utils'
import { devLogin, fetchAuthConfig, login, register } from '@/services/auth'
import { ME_KEY } from './authContext'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 10

const POINTS = [
  { icon: <LockIcon />, text: 'Przestrzenie, artykuły i analizy widzisz tylko Ty.' },
  { icon: <KeyRoundIcon />, text: 'Klucze API własnych modeli są przechowywane zaszyfrowane.' },
  { icon: <NetworkIcon />, text: 'Graf wiedzy budowany z Twoich dokumentów.' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-fg-muted">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

// Spacing goes inside the children: a gap outside would jump on mount and unmount.
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={move.panel}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <TextInput
        required
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pr-11"
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-label={shown ? 'Ukryj hasło' : 'Pokaż hasło'}
        aria-pressed={shown}
        className={cn(
          'absolute inset-y-0 right-0 flex w-11 items-center justify-center text-fg-subtle hover:text-fg [&_svg]:size-4',
          focusRing
        )}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

function Strength({ password }: { password: string }) {
  const level =
    password.length >= 16 ? 3 : password.length >= 12 ? 2 : password.length >= 10 ? 1 : 0
  const colors = ['var(--danger)', 'var(--ink-ochre)', 'var(--ink-moss)', 'var(--ink-fir)']
  const labels = ['Za krótkie', 'Wystarczające', 'Dobre', 'Mocne']
  return (
    <span className="mt-2 flex items-center gap-2" aria-live="polite">
      <span className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 bg-line-soft transition-colors"
            style={password && i <= Math.max(level - 1, 0) ? { background: colors[level] } : {}}
          />
        ))}
      </span>
      <span
        className="w-24 text-right text-xs"
        style={{ color: password ? colors[level] : undefined }}
      >
        {password ? labels[level] : ''}
      </span>
    </span>
  )
}

export function AuthPage() {
  const queryClient = useQueryClient()
  const config = useQuery({ queryKey: ['auth', 'config'], queryFn: fetchAuthConfig })
  const registrationOpen = config.data?.registration_open ?? false
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const quickLogin = useMutation({
    mutationFn: devLogin,
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })
  const devAccounts = config.data?.dev_accounts ?? []

  const submit = useMutation({
    mutationFn: () => (mode === 'login' ? login(email, password) : register(email, password)),
    onSuccess: (user) => queryClient.setQueryData(ME_KEY, user),
  })

  const switchTo = (next: Mode) => {
    setMode(next)
    setRepeat('')
    setMismatch(false)
    submit.reset()
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'register' && password !== repeat) {
      setMismatch(true)
      return
    }
    submit.mutate()
  }

  const registering = mode === 'register'
  const incomplete =
    !email.trim() || !password || (registering && (password.length < MIN_PASSWORD || !repeat))

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-page px-4 py-10 sm:px-8">
      <ContourBackdrop color="var(--ink-steel)" />
      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="deck grid size-12 place-items-center border border-fg bg-fg text-fg-inverse [--deck-shadow:var(--ink-steel)]">
              <AtlasMark size={28} />
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-fg">Atlas</span>
          </div>
          <div className="hidden flex-col gap-6 lg:flex">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-fg-faint uppercase">
              Inteligentna eksploracja dokumentów
            </p>
            <h1 className="text-display-xl text-fg">
              Twoja mapa wiedzy.
              <br />
              <span className="text-fg-faint">Tylko dla Ciebie.</span>
            </h1>
            <ul className="flex flex-col gap-3">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-fg-muted">
                  <span className="grid size-8 shrink-0 place-items-center border border-line bg-surface text-fg [&_svg]:size-4">
                    {p.icon}
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="deck-lg w-full max-w-md justify-self-center border border-fg bg-surface p-6 [--deck-shadow:var(--fg)] sm:p-8 lg:justify-self-end">
          {registrationOpen && (
            <div
              role="tablist"
              aria-label="Rodzaj formularza"
              className="mb-6 grid grid-cols-2 border border-line"
            >
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchTo(m)}
                  className={cn(
                    'relative h-10 text-sm font-semibold transition-colors spring-quick',
                    mode === m ? 'text-fg-inverse' : 'text-fg-muted hover:text-fg',
                    focusRing
                  )}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-0 bg-fg"
                      transition={move.quick}
                    />
                  )}
                  <span className="relative">{m === 'login' ? 'Logowanie' : 'Rejestracja'}</span>
                </button>
              ))}
            </div>
          )}

          <h2 className="text-title text-fg">{registering ? 'Załóż konto' : 'Zaloguj się'}</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            {registering
              ? 'Nowe konto zaczyna z pustą listą przestrzeni.'
              : 'Wpisz adres e-mail i hasło swojego konta.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="E-mail">
              <TextInput
                required
                type="email"
                autoComplete={registering ? 'email' : 'username'}
                autoFocus
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </Field>
            <div>
              <Field label="Hasło">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete={registering ? 'new-password' : 'current-password'}
                />
                <Collapse open={registering}>
                  <span className="block pt-1.5 font-normal text-fg-subtle">
                    Co najmniej {MIN_PASSWORD} znaków.
                    <Strength password={password} />
                  </span>
                </Collapse>
              </Field>
              <Collapse open={registering}>
                <div className="pt-4">
                  <Field label="Powtórz hasło">
                    <PasswordInput
                      value={repeat}
                      onChange={(v) => {
                        setRepeat(v)
                        setMismatch(false)
                      }}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              </Collapse>
              <Collapse open={mismatch}>
                <ErrorNote className="mt-4">Hasła nie są takie same.</ErrorNote>
              </Collapse>
              <Collapse open={!!submit.error}>
                <ErrorNote className="mt-4">{submit.error?.message}</ErrorNote>
              </Collapse>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="xl"
              className="mt-2 w-full"
              disabled={submit.isPending || incomplete}
            >
              {submit.isPending
                ? registering
                  ? 'Zakładam konto…'
                  : 'Loguję…'
                : registering
                  ? 'Załóż konto'
                  : 'Zaloguj się'}
            </Button>
          </form>

          {config.isSuccess && !registrationOpen && (
            <p className="mt-6 border-t border-line-soft pt-4 text-sm text-fg-subtle">
              Rejestracja nowych kont jest obecnie wyłączona przez administratora.
            </p>
          )}

          {devAccounts.length > 0 && (
            <div className="mt-6 border-t border-dashed border-line pt-4">
              <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                Konta testowe · tryb deweloperski
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {devAccounts.map((account) => (
                  <Button
                    key={account.email}
                    variant="secondary"
                    size="md"
                    className="w-full justify-between"
                    disabled={quickLogin.isPending}
                    onClick={() => quickLogin.mutate(account.email)}
                  >
                    <span className="truncate">{account.email}</span>
                    <span
                      className={cn(
                        'border px-1.5 py-0.5 text-[11px] tracking-wide uppercase',
                        account.role === 'admin'
                          ? 'border-fg bg-fg text-fg-inverse'
                          : 'border-line text-fg-subtle'
                      )}
                    >
                      {account.role === 'admin' ? 'Admin' : 'Użytkownik'}
                    </span>
                  </Button>
                ))}
              </div>
              {quickLogin.error && (
                <ErrorNote className="mt-3">{quickLogin.error.message}</ErrorNote>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
