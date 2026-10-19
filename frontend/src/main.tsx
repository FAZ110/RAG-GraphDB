import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GlobalSearchProvider } from './components/search/GlobalSearchProvider.tsx'
import { AddArticlesProvider } from './components/Spaces/add/AddArticlesProvider.tsx'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AddArticlesProvider>
          <GlobalSearchProvider>
            <App />
          </GlobalSearchProvider>
        </AddArticlesProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
