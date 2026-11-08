import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import { AtlasMark } from '@/components/nav/AtlasMark'
import { Button, ErrorNote } from '@/components/deck'
import { AUTH_EXPIRED } from '@/services/api'
import { fetchMe, logout } from '@/services/auth'
import { AuthContext, leaveSession, ME_KEY } from './authContext'
import { AuthPage } from './AuthPage'
import { LandingPage } from '@/pages/LandingPage'

export function AuthGate({ children }: { children: ReactNode }) {
  const me = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: Infinity, retry: false })
  const user = me.data

  useEffect(() => {
    if (!user) return
    window.addEventListener(AUTH_EXPIRED, leaveSession)
    return () => window.removeEventListener(AUTH_EXPIRED, leaveSession)
  }, [user])

  const auth = useMemo(
    () =>
      user
        ? {
            user,
            signOut: async () => {
              await logout().catch(() => undefined)
              leaveSession()
            },
          }
        : null,
    [user]
  )

  if (me.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-page text-fg-faint" aria-busy="true">
        <AtlasMark size={40} />
      </div>
    )
  }
  if (me.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-page p-6">
        <div className="flex max-w-sm flex-col items-start gap-4">
          <ErrorNote>Nie udało się połączyć z serwerem: {me.error.message}</ErrorNote>
          <Button variant="secondary" size="sm" onClick={() => me.refetch()}>
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    )
  }
  if (!auth) {
    return (
      // Any other address keeps its URL, so signing in lands on the page that was asked for.
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    )
  }
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
