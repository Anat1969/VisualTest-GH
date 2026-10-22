import { useEffect, useRef, useState } from 'react';
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
  { to: '/intelligences', label: 'אינטליגנציות' },
  { to: '/library', label: 'ספרייה' },
];

/** Anat's mark: a dark pyramid on a drafting grid. Drawn once on load, breathes on hover. */
function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden>
      <rect x="0.5" y="0.5" width="39" height="39" rx="6" className="lm-paper" />
      <g className="lm-grid">
        <line x1="6" y1="13" x2="34" y2="13" />
        <line x1="6" y1="22" x2="34" y2="22" />
        <line x1="13" y1="6" x2="13" y2="34" />
        <line x1="24" y1="6" x2="24" y2="34" />
      </g>
      <line className="lm-axis" x1="31" y1="4" x2="31" y2="36" />
      <defs>
        <linearGradient id="lm-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2f36" />
          <stop offset="1" stopColor="#7d858f" />
        </linearGradient>
      </defs>
      <path className="lm-pyramid" d="M6 33 L17 14 L28 33 Z" fill="url(#lm-shade)" />
      <path className="lm-face" d="M17 14 L28 33 L19 33 Z" />
    </svg>
  );
}

/** The logo is the door to the utility links: copy, research, dev chat, install. */
function LogoMenu({ onInstall }: { onInstall: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('העתקת קישור', window.location.href);
    }
  };

  return (
    <div className="logo-menu" ref={ref}>
      <button className={`logo-btn ${open ? 'open' : ''}`} aria-expanded={open} aria-haspopup="menu" aria-label="אד' ענת שטיבלמן: קישורים" onClick={() => setOpen((v) => !v)}>
        <span className="logo-name">{OWNER}</span>
        <LogoMark />
      </button>
      {open && (
        <div className="logo-pop" role="menu">
          <button role="menuitem" className="logo-item" onClick={copy} aria-live="polite">
            {copied ? 'הקישור הועתק' : 'העתקת קישור'}
            <span>הכתובת של הדף הזה</span>
          </button>
          <a role="menuitem" className="logo-item" href={RESEARCH_URL} target="_blank" rel="noreferrer">
            פרויקט המחקר
            <span>שיחת המחקר ב-Claude</span>
          </a>
          <a role="menuitem" className="logo-item" href={DEV_CHAT_URL} target="_blank" rel="noreferrer">
            שיחת הפיתוח
            <span>Claude Code</span>
          </a>
          <button
            role="menuitem"
            className="logo-item"
            onClick={() => {
              setOpen(false);
              onInstall();
            }}
          >
            התקנה
            <span>כאפליקציה ב-Chrome</span>
          </button>
        </div>
      )}
    </div>
  );
}

const OWNER = "אד' ענת שטיבלמן";

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [installable, setInstallable] = useState(canInstall());
  const [installHelp, setInstallHelp] = useState(false);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);

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
        </nav>

        <button className="btn ghost menu-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'סגירה' : 'תפריט'}
        </button>
        <LogoMenu onInstall={install} />
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
