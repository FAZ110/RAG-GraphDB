import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageTransition } from './components/PageTransition'
import { GraphPage } from './pages/GraphPage'
import { HomePlaceholder } from './pages/HomePage'
import { SpacesPage } from './pages/SpacesPage'

export interface AppRoute {
  path: string
  element: ReactNode
  label: string
  showInNavbar: boolean
}

const page = (element: ReactNode) => <PageTransition>{element}</PageTransition>

export const appRoutes: AppRoute[] = [
  { path: '/', element: page(<HomePlaceholder />), label: 'Start', showInNavbar: true },
  { path: '/spaces', element: page(<SpacesPage />), label: 'Przestrzenie', showInNavbar: true },
  {
    path: '/spaces/:spaceId',
    element: page(<SpacesPage />),
    label: 'Przestrzeń',
    showInNavbar: false,
  },
  { path: '/graph', element: page(<GraphPage />), label: 'Graf', showInNavbar: true },
  // Adding articles moved into the spaces; old links land there.
  {
    path: '/extract',
    element: <Navigate to="/spaces" replace />,
    label: 'Ekstrakcja',
    showInNavbar: false,
  },
]
