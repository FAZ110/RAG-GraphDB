import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AuthGate } from './components/auth/AuthGate.tsx'
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
        {/* Follows the system's reduce motion setting: moves become instant, fades stay. */}
        <MotionConfig reducedMotion="user">
          <AuthGate>
            <AddArticlesProvider>
              <GlobalSearchProvider>
                <App />
              </GlobalSearchProvider>
            </AddArticlesProvider>
          </AuthGate>
        </MotionConfig>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
