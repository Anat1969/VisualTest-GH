// Service worker registration. The install prompt is handled by the A&I logo button (<ai-menu>).
export function initPwa() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
  }
}
