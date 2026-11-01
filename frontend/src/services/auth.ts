import type { AdminUser, AppSettings, Role, User } from '../types'
import { API_URL, readError } from './api'

async function send<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await readError(response))
  return response.status === 204 ? (undefined as T) : response.json()
}

export const fetchMe = async (): Promise<User | null> => {
  const response = await fetch(`${API_URL}/auth/me`)
  if (response.status === 401) return null
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export const fetchAuthConfig = () => send<AppSettings>('/auth/config')

export const login = (email: string, password: string) =>
  send<User>('/auth/login', 'POST', { email, password })

export const register = (email: string, password: string) =>
  send<User>('/auth/register', 'POST', { email, password })

export const logout = () => send<void>('/auth/logout', 'POST')

export const changePassword = (currentPassword: string, newPassword: string) =>
  send<void>('/auth/password', 'POST', {
    current_password: currentPassword,
    new_password: newPassword,
  })

const userUrl = (id: string) => `/admin/users/${encodeURIComponent(id)}`

export const fetchUsers = () => send<AdminUser[]>('/admin/users')

export const updateUser = (
  id: string,
  changes: Partial<{ role: Role; disabled: boolean; server_models: boolean }>
) => send<User>(userUrl(id), 'PATCH', changes)

export const logoutUser = (id: string) => send<void>(`${userUrl(id)}/logout`, 'POST')

export const deleteUser = (id: string) => send<void>(userUrl(id), 'DELETE')

export const saveAppSettings = (settings: AppSettings) =>
  send<AppSettings>('/admin/settings', 'PUT', settings)
