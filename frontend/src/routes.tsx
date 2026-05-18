import { ExtractorPage } from "./pages/ExtractorPage"
import { GraphPage } from "./pages/GraphPage"
import { HomePlaceholder } from "./pages/HomePage"

export interface AppRoute {
    path: string
    element: React.ReactNode
    label: string
    showInNavbar: boolean
}


export const appRoutes: AppRoute[] = [
    {
        path: '/',
        element: <HomePlaceholder/>,
        label: 'Home',
        showInNavbar: true,
    },

    {
        path: '/extract',
        element: <ExtractorPage/>,
        label: 'Extract',
        showInNavbar: true,
    },

    {
        path: '/graph',
        element: <GraphPage/>,
        label: 'Graph',
        showInNavbar: true,
    }
]




