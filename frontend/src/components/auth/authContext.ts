import { createContext, useContext } from 'react'
import type { User } from '@/types'

export const ME_KEY = ['auth', 'me']

interface Auth {
  user: User
  signOut: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs the AuthGate above it')
  return auth
}

// A full reload, so nothing the previous user loaded stays in memory.
export function leaveSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('atlas:')) localStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable: nothing was kept there either */
  }
  window.location.assign('/')
}
