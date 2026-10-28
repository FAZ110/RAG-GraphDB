import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AnalysesPage } from './pages/AnalysesPage'
import { AnalysisEditorPage } from './pages/AnalysisEditorPage'
import { GraphPage } from './pages/GraphPage'
import { HomePlaceholder } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SpacesPage } from './pages/SpacesPage'

export interface AppRoute {
  path: string
  element: ReactNode
  label: string
  showInNavbar: boolean
}

export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePlaceholder />, label: 'Start', showInNavbar: true },
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
  // Adding articles moved into the spaces; old links land there.
  {
    path: '/extract',
    element: <Navigate to="/spaces" replace />,
    label: 'Ekstrakcja',
    showInNavbar: false,
  },
]
