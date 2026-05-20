import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { appRoutes } from './routes';
import { Route, Routes } from 'react-router-dom';

const queryClient = new QueryClient();

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          {appRoutes.map((route) => (
            <Route 
              key={route.path} 
              path={route.path} 
              element={route.element} 
            />
          ))}
          
          <Route path="*" element={<h1 className="text-2xl font-bold text-center mt-10">404 - Strona nie znaleziona</h1>} />
        </Routes>
      </main>
    </div>
    </QueryClientProvider>
  );
}

export default App;