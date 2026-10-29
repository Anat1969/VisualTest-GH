import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { Empty, Loading } from './components/ui/States';
import { syncNow } from './data/store';
import Home from './pages/Home';

// Every page except Home loads on demand. Once the first screen is up and the browser is idle,
// all of them are fetched in the background, so moving between pages never waits on the network.
const pages = {
  Setup: () => import('./pages/Setup'),
  Run: () => import('./pages/Run'),
  Summary: () => import('./pages/Summary'),
  Diagnosis: () => import('./pages/Diagnosis'),
  Progress: () => import('./pages/Progress'),
  Library: () => import('./pages/Library'),
  Intelligences: () => import('./pages/Intelligences'),
  IntelligencePage: () => import('./pages/IntelligencePage'),
  FusionPage: () => import('./pages/FusionPage'),
};
const Setup = lazy(pages.Setup);
const Run = lazy(pages.Run);
const Summary = lazy(pages.Summary);
const Diagnosis = lazy(pages.Diagnosis);
const Progress = lazy(pages.Progress);
const Library = lazy(pages.Library);
const Intelligences = lazy(pages.Intelligences);
const IntelligencePage = lazy(pages.IntelligencePage);
const FusionPage = lazy(pages.FusionPage);

function prefetchPages() {
  const idle = (cb: () => void) =>
    'requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500);
  // Most likely next steps first: a drill run, then the content pages.
  const order = [pages.Run, pages.Setup, pages.Intelligences, pages.IntelligencePage, pages.Library, pages.Summary, pages.Progress, pages.Diagnosis, pages.FusionPage];
  const next = () => {
    const load = order.shift();
    if (load) load().catch(() => {}).finally(() => idle(next));
  };
  idle(next);
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  useEffect(() => {
    void syncNow();
    prefetchPages();
  }, []);

  return (
    <>
      <a href="#main" className="sr-only">
        דילוג לתוכן
      </a>
      <TopNav />
      <div id="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Setup mode="practice" key="practice" />} />
            <Route path="/exam" element={<Setup mode="exam" key="exam" />} />
            <Route path="/simulation" element={<Setup mode="simulation" key="simulation" />} />
            <Route path="/run" element={<Run />} />
            <Route path="/summary/:id" element={<Summary />} />
            <Route path="/diagnosis" element={<Diagnosis />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/library" element={<Library />} />
            <Route path="/intelligences" element={<Intelligences />} />
            <Route path="/intelligences/:id" element={<IntelligencePage />} />
            <Route path="/fusions/:id" element={<FusionPage />} />
            <Route
              path="*"
              element={
                <main className="page">
                  <Empty title="הדף לא נמצא" action={{ to: '/', label: 'לדף הבית' }} />
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
