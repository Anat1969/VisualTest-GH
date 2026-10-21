import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Loading({ text = 'טוען' }: { text?: string }) {
  return (
    <div className="state" role="status">
      <div className="spinner" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: { to: string; label: string } }) {
  return (
    <div className="state card flat">
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action && (
        <Link className="btn primary" to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ title = 'משהו השתבש', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="state card flat" role="alert">
      <h3>{title}</h3>
      {detail && <p className="muted small">{detail}</p>}
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          ניסיון חוזר
        </button>
      )}
    </div>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
