import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/nav/Navbar';
import { PageBackdrop } from './components/layout/PageBackdrop';
import { PageTransition } from './components/layout/PageTransition';
import { PageDirection, directionBetween } from './components/layout/pageDirection';
import { appRoutes } from './routes';
import { Route, Routes, useLocation } from 'react-router-dom';

function AnimatedRoutes() {
  const location = useLocation();
  // Keyed by the first path segment, so moving between spaces stays on the same page
  // instead of replaying the page transition.
  const section = location.pathname.split('/')[1];
  const [move, setMove] = useState({ section, direction: 0 });
  if (move.section !== section) {
    setMove({ section, direction: directionBetween(move.section, section) });
  }
  return (
    <PageDirection.Provider value={move.direction}>
      <AnimatePresence mode="wait" initial={false} custom={move.direction}>
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
    </PageDirection.Provider>
  );
}

function App() {
  return (
    // `--nav-block` is the height of the phone navbar, which full-height pages subtract.
    <div className="min-h-screen bg-page [--nav-block:3.75rem] sm:flex sm:[--nav-block:0rem]">
      <PageBackdrop />
      <Navbar />
      {/* Positioned, so it paints over the fixed backdrop. */}
      <main className="relative min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default App;