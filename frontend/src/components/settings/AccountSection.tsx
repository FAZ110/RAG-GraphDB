import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LogOutIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/authContext'
import { Button, ErrorNote, surface, TextInput } from '@/components/deck'
import { cn } from '@/lib/utils'
import { changePassword } from '@/services/auth'

const MIN_PASSWORD = 10

export function AccountSection() {
  const { user, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const change = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setRepeat('')
      toast.success('Zmieniono hasło, inne urządzenia zostały wylogowane')
    },
  })
  const mismatch = repeat !== '' && next !== repeat

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!mismatch) change.mutate()
  }

  return (
    <section className={cn(surface, 'p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-title text-fg">Konto</h2>
          <p className="mt-1 truncate text-sm text-fg-subtle">
            {user.email} · {user.role === 'admin' ? 'administrator' : 'użytkownik'}
            {!user.server_models && ' · bez dostępu do modeli serwera'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>
          <LogOutIcon />
          Wyloguj
        </Button>
      </div>

      <form
        onSubmit={submit}
        aria-label="Zmiana hasła"
        className="mt-5 grid gap-3 border border-line bg-surface-sunken p-4 sm:grid-cols-3"
      >
        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
        <label className="block text-xs font-medium text-fg-muted">
          Obecne hasło
          <TextInput
            required
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block text-xs font-medium text-fg-muted">
          Nowe hasło
          <TextInput
            required
            minLength={MIN_PASSWORD}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block text-xs font-medium text-fg-muted">
          Powtórz nowe hasło
          <TextInput
            required
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="mt-1"
          />
        </label>
        <p className="text-xs text-fg-subtle sm:col-span-3">
          Co najmniej {MIN_PASSWORD} znaków. Po zmianie hasła pozostałe urządzenia zostaną
          wylogowane.
        </p>
        {mismatch && <ErrorNote className="sm:col-span-3">Nowe hasła nie są takie same.</ErrorNote>}
        {change.error && <ErrorNote className="sm:col-span-3">{change.error.message}</ErrorNote>}
        <div className="sm:col-span-3">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={change.isPending || mismatch || next.length < MIN_PASSWORD}
          >
            {change.isPending ? 'Zmieniam…' : 'Zmień hasło'}
          </Button>
        </div>
      </form>
    </section>
  )
}
