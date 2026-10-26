import { useLayoutEffect, useRef, useState } from 'react';
import { Navbar } from './components/nav/Navbar';
import { PageBackdrop } from './components/layout/PageBackdrop';
import { PageTransition } from './components/layout/PageTransition';
import { directionBetween } from './components/layout/pageDirection';
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
  const opened = useRef(section);
  useLayoutEffect(() => {
    if (opened.current === section) return;
    opened.current = section;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [section]);
  return (
    // No exit: the old page goes at once, so the screen never blanks while the new one settles in.
    <PageTransition key={section} direction={move.direction}>
      <Routes location={location}>
        {appRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route
          path="*"
          element={
            <h1 className="text-2xl font-bold text-center mt-10">
              404 - Strona nie znaleziona
            </h1>
          }
        />
      </Routes>
    </PageTransition>
  );
}

function App() {
  return (
    // `--nav-block` is the height of the phone navbar, which full-height pages subtract.
    <div className="min-h-screen bg-page [--nav-block:3.75rem] sm:flex sm:[--nav-block:0rem]">
      <PageBackdrop />
      <Navbar />
      {/* Positioned, so it paints over the fixed backdrop. */}
      <main className="relative min-w-0 flex-1 p-4 sm:p-6 lg:p-8 lg:pl-5">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default App;