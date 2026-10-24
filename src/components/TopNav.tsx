import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string };
    }
  }
}

export function TopNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);

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
        {/* A&I logo button: copy link, research, dev chat, install (https://appofapp-gh.vercel.app/ai-menu.js) */}
        <div className="logo-menu">
          <ai-menu chat={DEV_CHAT_URL} research={RESEARCH_URL} />
        </div>
      </div>
    </header>
  );
}
