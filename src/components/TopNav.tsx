import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { canInstall, onInstallChange, promptInstall } from '../pwa';
import './nav.css';

export const DEV_CHAT_URL = 'https://claude.ai/code/session_01VTafTecgLATjn6DeCZpphn';
export const RESEARCH_URL = 'https://claude.ai/chat/0c2eb29a-2e1d-4e51-96ee-83224b007eac';

const LINKS = [
  { to: '/', label: 'בית', end: true },
  { to: '/practice', label: 'תרגול' },
  { to: '/exam', label: 'מבחן' },
  { to: '/simulation', label: 'סימולציה' },
  { to: '/diagnosis', label: 'אבחון' },
  { to: '/progress', label: 'התקדמות' },
  { to: '/library', label: 'ספרייה' },
];

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installable, setInstallable] = useState(canInstall());
  const [installHelp, setInstallHelp] = useState(false);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('העתקת קישור', window.location.href);
    }
  };

  const install = async () => {
    if (installable) await promptInstall();
    else setInstallHelp((v) => !v);
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="מרחב: לדף הבית">
          <img src="/icon.svg" alt="" width={28} height={28} />
          <span>מרחב</span>
        </Link>

        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="ניווט ראשי">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
          <div className="nav-tools">
            <button className="btn ghost" onClick={copy} aria-live="polite">
              {copied ? 'הקישור הועתק' : 'העתקת קישור'}
            </button>
            <a className="btn ghost" href={DEV_CHAT_URL} target="_blank" rel="noreferrer">
              שיחת הפיתוח
            </a>
            <a className="btn ghost" href={RESEARCH_URL} target="_blank" rel="noreferrer">
              פרויקט המחקר
            </a>
            <button className="btn" onClick={install}>
              התקנה
            </button>
          </div>
        </nav>

        <button className="btn ghost menu-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'סגירה' : 'תפריט'}
        </button>
      </div>
      {installHelp && (
        <div className="install-help" role="status">
          להתקנה ב-Chrome: תפריט הדפדפן, ואז "התקנת האפליקציה" או "הוספה למסך הבית". אם האפליקציה כבר מותקנת, היא תיפתח מהמסך הראשי.
          <button className="btn ghost" onClick={() => setInstallHelp(false)}>
            סגירה
          </button>
        </div>
      )}
    </header>
  );
}
