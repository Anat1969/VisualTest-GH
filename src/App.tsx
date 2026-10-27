import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { Empty, Loading } from './components/ui/States';
import { syncNow } from './data/store';
import Home from './pages/Home';

const Setup = lazy(() => import('./pages/Setup'));
const Run = lazy(() => import('./pages/Run'));
const Summary = lazy(() => import('./pages/Summary'));
const Diagnosis = lazy(() => import('./pages/Diagnosis'));
const Progress = lazy(() => import('./pages/Progress'));
const Library = lazy(() => import('./pages/Library'));
const Intelligences = lazy(() => import('./pages/Intelligences'));
const IntelligencePage = lazy(() => import('./pages/IntelligencePage'));
const FusionPage = lazy(() => import('./pages/FusionPage'));

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  useEffect(() => {
    void syncNow();
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
