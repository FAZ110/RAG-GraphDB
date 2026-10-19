import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { PageTransition } from './components/PageTransition';
import { appRoutes } from './routes';
import { Route, Routes, useLocation } from 'react-router-dom';

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  // Keyed by the first path segment, so moving between spaces stays on the same page
  // instead of replaying the page transition.
  const section = location.pathname.split('/')[1];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={section}>
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
      <div className="min-h-screen bg-page">
        <Navbar />
        <main className="p-4 sm:p-6 lg:p-8">
          <AnimatedRoutes />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;