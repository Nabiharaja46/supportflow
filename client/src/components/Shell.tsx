import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

/**
 * App chrome: brand, live API status dot (the Phase-0 health check, kept
 * alive), signed-in user, and logout.
 */
export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api('GET', '/health', { auth: false })
      .then(() => {
        if (!cancelled) setApiUp(true);
      })
      .catch(() => {
        if (!cancelled) setApiUp(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">SupportFlow</span>
            <span
              title={apiUp === null ? 'Checking API…' : apiUp ? 'API connected' : 'API unreachable'}
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                apiUp === null ? 'animate-pulse bg-priority-medium' : apiUp ? 'bg-success' : 'bg-error'
              }`}
            />
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-ink-muted">{user.name}</span>
              <span className="rounded bg-border px-2 py-0.5 text-xs uppercase tracking-wide text-ink-muted">
                {user.role}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded border border-border px-3 py-1 text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}