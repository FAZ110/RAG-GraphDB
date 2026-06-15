import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { PageTransition } from './components/PageTransition';
import { appRoutes } from './routes';
import { Route, Routes, useLocation } from 'react-router-dom';

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route
          path="*"
          element={
            <PageTransition>
              <h1 className="text-2xl font-bold text-center mt-10">
                404 - Strona nie znaleziona
              </h1>
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <AnimatedRoutes />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;