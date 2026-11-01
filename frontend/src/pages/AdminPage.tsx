import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LogOutIcon,
  ShieldIcon,
  ShieldOffIcon,
  Trash2Icon,
  UserRoundXIcon,
  UserRoundCheckIcon,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Switch } from '@/components/admin/Switch'
import { ME_KEY, useAuth } from '@/components/auth/authContext'
import { ConfirmPopover, ErrorNote, IconButton, surface } from '@/components/deck'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import {
  deleteUser,
  fetchAuthConfig,
  fetchUsers,
  logoutUser,
  saveAppSettings,
  updateUser,
} from '@/services/auth'
import type { AdminUser } from '@/types'

const USERS_KEY = ['admin', 'users']
const CONFIG_KEY = ['auth', 'config']

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'nigdy'

function useAdminAction<T>(fn: (arg: T) => Promise<unknown>, done: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(done)
      void queryClient.invalidateQueries({ queryKey: ME_KEY })
      return queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function AdminPage() {
  const { user } = useAuth()
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-4">
      <PageHeader title="Administracja">
        Konta użytkowników i dostęp do modeli językowych serwera. Administrator nie widzi
        przestrzeni, artykułów ani analiz innych osób.
      </PageHeader>
      <RegistrationSection />
      <UsersSection selfId={user.id} />
    </div>
  )
}

function RegistrationSection() {
  const queryClient = useQueryClient()
  const config = useQuery({ queryKey: CONFIG_KEY, queryFn: fetchAuthConfig })
  const save = useMutation({
    mutationFn: (open: boolean) => saveAppSettings({ registration_open: open }),
    onSuccess: (saved) => {
      queryClient.setQueryData(CONFIG_KEY, saved)
      toast.success(saved.registration_open ? 'Rejestracja włączona' : 'Rejestracja wyłączona')
    },
    onError: (error) => toast.error(error.message),
  })
  const open = config.data?.registration_open ?? false

  return (
    <section className={cn(surface, 'flex flex-wrap items-center justify-between gap-4 p-6')}>
      <div className="max-w-2xl">
        <h2 className="text-heading text-fg">Rejestracja nowych kont</h2>
        <p className="mt-1 text-sm text-fg-subtle">
          {open
            ? 'Każdy, kto otworzy aplikację, może założyć konto.'
            : 'Formularz rejestracji jest ukryty; istniejące konta logują się bez zmian.'}
        </p>
      </div>
      <Switch
        checked={open}
        onChange={(next) => save.mutate(next)}
        disabled={!config.isSuccess || save.isPending}
        label="Pozwól zakładać nowe konta"
      />
    </section>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-2 border-line pl-3">
      <p className="text-figure text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{label}</p>
    </div>
  )
}

function UsersSection({ selfId }: { selfId: string }) {
  const users = useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers })
  const list = users.data ?? []

  return (
    <section className={cn(surface, 'p-6')}>
      <h2 className="text-heading text-fg">Użytkownicy</h2>
      {users.error && <ErrorNote className="mt-4">{users.error.message}</ErrorNote>}
      {users.isSuccess && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="kont" value={list.length} />
            <Figure label="administratorów" value={list.filter((u) => u.role === 'admin').length} />
            <Figure label="z modelami serwera" value={list.filter((u) => u.server_models).length} />
            <Figure label="zablokowanych" value={list.filter((u) => u.disabled).length} />
          </div>
          <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
            {list.map((u) => (
              <UserRow key={u.id} user={u} self={u.id === selfId} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Badge({
  children,
  tone = 'plain',
}: {
  children: ReactNode
  tone?: 'plain' | 'dark' | 'danger'
}) {
  return (
    <span
      className={cn(
        'shrink-0 border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        tone === 'dark' && 'border-fg bg-fg text-fg-inverse',
        tone === 'danger' && 'border-danger-line bg-danger-surface text-danger',
        tone === 'plain' && 'border-line text-fg-subtle'
      )}
    >
      {children}
    </span>
  )
}

function UserRow({ user, self }: { user: AdminUser; self: boolean }) {
  const [confirming, setConfirming] = useState<'delete' | 'block' | null>(null)
  const update = useAdminAction(
    (changes: Parameters<typeof updateUser>[1]) => updateUser(user.id, changes),
    'Zapisano zmiany'
  )
  const signOut = useAdminAction(() => logoutUser(user.id), 'Wylogowano ze wszystkich urządzeń')
  const remove = useAdminAction(() => deleteUser(user.id), 'Usunięto konto')
  const busy = update.isPending || remove.isPending
  const selfNote = 'Nie możesz tego zrobić z własnym kontem'

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-6 gap-y-3 py-4',
        user.disabled && 'opacity-70'
      )}
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-fg">{user.email}</span>
          {self && <Badge>Ty</Badge>}
          {user.role === 'admin' && <Badge tone="dark">Admin</Badge>}
          {user.disabled && <Badge tone="danger">Zablokowane</Badge>}
        </p>
        <p className="mt-1 text-sm text-fg-subtle">
          Od {date(user.created_at)} · ostatnie logowanie: {date(user.last_login_at)} ·{' '}
          {user.space_count} przestrz. · {user.article_count} art.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-fg-muted">
        Modele serwera
        <Switch
          checked={user.server_models}
          disabled={busy}
          onChange={(next) => update.mutate({ server_models: next })}
          label={`Modele serwera dla ${user.email}`}
        />
      </label>

      <div className="flex items-center gap-2">
        <IconButton
          variant="secondary"
          label={
            self
              ? selfNote
              : user.role === 'admin'
                ? 'Odbierz uprawnienia administratora'
                : 'Nadaj uprawnienia administratora'
          }
          disabled={self || busy}
          onClick={() => update.mutate({ role: user.role === 'admin' ? 'user' : 'admin' })}
        >
          {user.role === 'admin' ? <ShieldOffIcon /> : <ShieldIcon />}
        </IconButton>
        <IconButton
          variant="secondary"
          label="Wyloguj ze wszystkich urządzeń"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate(undefined)}
        >
          <LogOutIcon />
        </IconButton>
        {user.disabled ? (
          <IconButton
            variant="secondary"
            label="Odblokuj konto"
            disabled={busy}
            onClick={() => update.mutate({ disabled: false })}
          >
            <UserRoundCheckIcon />
          </IconButton>
        ) : (
          <ConfirmPopover
            open={confirming === 'block'}
            onOpenChange={(open) => setConfirming(open ? 'block' : null)}
            question={`Zablokować ${user.email}?`}
            detail="Użytkownik zostanie wylogowany i nie zaloguje się, dopóki go nie odblokujesz. Dane zostają."
            confirmLabel="Zablokuj"
            pending={update.isPending}
            onConfirm={() =>
              update.mutate({ disabled: true }, { onSettled: () => setConfirming(null) })
            }
          >
            <IconButton
              variant="danger-outline"
              label={self ? selfNote : 'Zablokuj konto'}
              disabled={self || busy}
            >
              <UserRoundXIcon />
            </IconButton>
          </ConfirmPopover>
        )}
        <ConfirmPopover
          open={confirming === 'delete'}
          onOpenChange={(open) => setConfirming(open ? 'delete' : null)}
          question={`Usunąć konto ${user.email}?`}
          detail={`Razem z ${user.space_count} przestrzeniami, ich artykułami, grafem i analizami. Tego nie da się cofnąć.`}
          error={remove.error?.message ?? null}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(undefined)}
        >
          <IconButton
            variant="danger-outline"
            label={self ? selfNote : 'Usuń konto'}
            disabled={self || busy}
          >
            <Trash2Icon />
          </IconButton>
        </ConfirmPopover>
      </div>
    </li>
  )
}
