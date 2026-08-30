import type { ReactNode } from 'react';

interface BannerProps {
  kind: 'success' | 'error' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}

const STYLES = {
  success: 'border-success/40 bg-success/10 text-success',
  error: 'border-error/40 bg-error/10 text-error',
  info: 'border-accent/40 bg-accent/10 text-accent',
} as const;

export default function Banner({ kind, children, onDismiss }: BannerProps) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded border px-4 py-3 text-sm ${STYLES[kind]}`}
    >
      <div>{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          ×
        </button>
      )}
    </div>
  );
}