import { Component, lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { Empty, ErrorState, Loading } from './components/ui/States';
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
/*
 * A page file can fail to load: a flaky connection, or a new deploy while the app was open (the old file names
 * are gone). Retry once, then reload the page a single time to pick up the new build. The flag stops a reload loop.
 */
const RELOAD_FLAG = 'merhav:chunk-reload';
function sturdy<T extends ComponentType<never>>(load: () => Promise<{ default: T }>) {
  return () =>
    load()
      .catch(() => new Promise((r) => setTimeout(r, 700)).then(load))
      .then((m) => {
        // a page loaded: a later failure may reload once again
        try {
          sessionStorage.removeItem(RELOAD_FLAG);
        } catch {
          /* storage blocked */
        }
        return m;
      })
      .catch((err) => {
        let reloaded = false;
        try {
          reloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
          if (!reloaded) sessionStorage.setItem(RELOAD_FLAG, '1');
        } catch {
          reloaded = true;
        }
        if (!reloaded) {
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        throw err;
      });
}

class PageBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed)
      return (
        <main className="page">
          <ErrorState title="הדף לא נטען" detail="ייתכן שהחיבור נקטע או שיצאה גרסה חדשה של האפליקציה." onRetry={() => window.location.reload()} />
        </main>
      );
    return this.props.children;
  }
}

const Setup = lazy(sturdy(pages.Setup));
const Run = lazy(sturdy(pages.Run));
const Summary = lazy(sturdy(pages.Summary));
const Diagnosis = lazy(sturdy(pages.Diagnosis));
const Progress = lazy(sturdy(pages.Progress));
const Library = lazy(sturdy(pages.Library));
const Intelligences = lazy(sturdy(pages.Intelligences));
const IntelligencePage = lazy(sturdy(pages.IntelligencePage));
const FusionPage = lazy(sturdy(pages.FusionPage));

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
        <PageBoundary resetKey={pathname}>
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
        </PageBoundary>
      </div>
    </>
  );
}
