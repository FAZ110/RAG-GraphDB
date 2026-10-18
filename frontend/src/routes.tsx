import type { ReactNode } from 'react'
import { ExtractorPage } from "./pages/ExtractorPage"
import { GraphPage } from "./pages/GraphPage"
import { SpacesPage } from "./pages/SpacesPage"
import { HomePlaceholder } from "./pages/HomePage"
import { PageTransition } from "./components/PageTransition"

export interface AppRoute {
    path: string
    element: ReactNode
    label: string
    showInNavbar: boolean
}


export const appRoutes: AppRoute[] = [
    {
        path: '/',
        element: <PageTransition><HomePlaceholder/></PageTransition>,
        label: 'Start',
        showInNavbar: true,
    },

    {
        path: '/spaces',
        element: <PageTransition><SpacesPage/></PageTransition>,
        label: 'Przestrzenie',
        showInNavbar: true,
    },

    {
        path: '/spaces/:spaceId',
        element: <PageTransition><SpacesPage/></PageTransition>,
        label: 'Przestrzeń',
        showInNavbar: false,
    },

    {
        path: '/extract',
        element: <PageTransition><ExtractorPage/></PageTransition>,
        label: 'Ekstrakcja',
        showInNavbar: true,
    },

    {
        path: '/graph',
        element: <PageTransition><GraphPage/></PageTransition>,
        label: 'Graf',
        showInNavbar: true,
    }
]




