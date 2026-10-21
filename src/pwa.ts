// Install prompt (Chrome) and service worker registration.
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    subs.forEach((s) => s());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((s) => s());
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
  }
}

export const canInstall = () => deferred !== null;

export function onInstallChange(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  subs.forEach((s) => s());
}
