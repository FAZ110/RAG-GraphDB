import type { ReactNode } from 'react'
import { ExtractorPage } from "./pages/ExtractorPage"
import { GraphPage } from "./pages/GraphPage"
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
        path: '/extract',
        element: <PageTransition><ExtractorPage/></PageTransition>,
        label: 'Ekstrakcja',
        showInNavbar: true,
    },

    {
        path: '/graph',
        element: <PageTransition><GraphPage/></PageTransition>,
        label: 'Graf wiedzy',
        showInNavbar: true,
    }
]




