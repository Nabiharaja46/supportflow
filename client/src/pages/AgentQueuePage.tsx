import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Ticket } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';

export default function AgentQueuePage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<{ tickets: Ticket[] }>('GET', '/tickets/queue');
      setTickets(data.tickets);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load the queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agent Work Queue</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Unassigned tickets in "New" (claimable) plus tickets assigned to you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadQueue()}
          disabled={loading}
          className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border disabled:opacity-50 focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <p className="flex items-center gap-3 text-ink-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
          Loading queue…
        </p>
      )}

      {!loading && loadError && (
        <div className="space-y-3">
          <Banner kind="error">{loadError}</Banner>
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && tickets && tickets.length === 0 && (
        <p className="rounded border border-dashed border-border p-6 text-center text-sm text-ink-muted">
          The queue is empty.
        </p>
      )}

      {!loading && !loadError && tickets && tickets.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {tickets.map((t) => (
            <li key={t._id}>
              <Link
                to={`/agent/tickets/${t._id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-border/30 focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-muted">{t.ticketNumber}</p>
                  <p className="truncate text-sm font-medium text-ink">{t.subject}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {new Date(t.createdAt).toLocaleString()} · Category:{' '}
                    {t.category ?? <span className="italic">Not yet triaged</span>} · Priority:{' '}
                    {t.priority ?? <span className="italic">Not yet triaged</span>}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}