// Service worker and version freshness. The install prompt is handled by the A&I logo button (<ai-menu>).
//
// Every deploy renames the page files. An app left open would otherwise keep asking for files that no longer exist.
// The worker (public/sw.js) keeps the old files available; here the app notices a newer deploy and moves to it with a
// full page load on the next page change, so the learner never meets a page that needs a manual refresh.

declare const __MERHAV_VERSION__: string;
const BUILD = typeof __MERHAV_VERSION__ === 'string' ? __MERHAV_VERSION__ : '';

let stale = false;
let lastCheck = 0;

/** True once a newer deploy is known: the next page change should be a full load. */
export const isStale = () => stale;

async function checkVersion() {
  if (!BUILD || Date.now() - lastCheck < 30_000) return;
  lastCheck = Date.now();
  try {
    const r = await fetch('/version.json', { cache: 'no-store' });
    if (!r.ok) return;
    const { version } = (await r.json()) as { version?: string };
    if (version && version !== BUILD) {
      stale = true;
      navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => undefined);
    }
  } catch {
    /* offline: keep the running version */
  }
}

/** Called on every in-app page change. */
export function onRouteChange() {
  void checkVersion();
}

export function initPwa() {
  if (!import.meta.env.PROD) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
    // a new worker took over: the page code is from an older deploy
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) stale = true;
      hadController = true;
    });
  }
  // back to the app after a while (phone wakes, tab refocused, page restored from memory): look for a newer deploy
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void checkVersion());
  window.addEventListener('pageshow', (e) => (e as PageTransitionEvent).persisted && void checkVersion());
  void checkVersion();
}
