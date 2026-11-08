import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AfterSignIn } from './components/auth/AfterSignIn'
import { AdminPage } from './pages/AdminPage'
import { AnalysesPage } from './pages/AnalysesPage'
import { AnalysisEditorPage } from './pages/AnalysisEditorPage'
import { GraphPage } from './pages/GraphPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SpacesPage } from './pages/SpacesPage'

export interface AppRoute {
  path: string
  element: ReactNode
  label: string
  showInNavbar: boolean
}

export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePage />, label: 'Start', showInNavbar: true },
  { path: '/spaces', element: <SpacesPage />, label: 'Przestrzenie', showInNavbar: true },
  {
    path: '/spaces/:spaceId',
    element: <SpacesPage />,
    label: 'Przestrzeń',
    showInNavbar: false,
  },
  { path: '/analyses', element: <AnalysesPage />, label: 'Analizy', showInNavbar: true },
  // `new` stands for an analysis not saved yet; it gets its id with its first entity.
  {
    path: '/analyses/:spaceId/:analysisId',
    element: <AnalysisEditorPage />,
    label: 'Analiza',
    showInNavbar: false,
  },
  { path: '/graph', element: <GraphPage />, label: 'Graf', showInNavbar: true },
  {
    path: '/graph/:spaceId',
    element: <GraphPage />,
    label: 'Graf przestrzeni',
    showInNavbar: false,
  },
  { path: '/settings', element: <SettingsPage />, label: 'Ustawienia', showInNavbar: false },
  { path: '/admin', element: <AdminPage />, label: 'Administracja', showInNavbar: false },
  // The addresses of the signed-out pages; signing in on one of them goes on to its `next`.
  { path: '/login', element: <AfterSignIn />, label: 'Logowanie', showInNavbar: false },
  { path: '/register', element: <AfterSignIn />, label: 'Rejestracja', showInNavbar: false },
  // Adding articles moved into the spaces; old links land there.
  {
    path: '/extract',
    element: <Navigate to="/spaces" replace />,
    label: 'Ekstrakcja',
    showInNavbar: false,
  },
]
