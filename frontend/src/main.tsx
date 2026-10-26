import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { GlobalSearchProvider } from './components/search/GlobalSearchProvider.tsx'
import { AddArticlesProvider } from './components/Spaces/add/AddArticlesProvider.tsx'
import './index.css'
import App from './App.tsx'
import { installMotionCss } from './design/motion'

const queryClient = new QueryClient()
installMotionCss()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AddArticlesProvider>
          <GlobalSearchProvider>
            {/* Follows the system's reduce motion setting: moves become instant, fades stay. */}
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </GlobalSearchProvider>
        </AddArticlesProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
