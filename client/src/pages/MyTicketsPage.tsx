import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Ticket } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';
import NewTicketForm from '../components/NewTicketForm';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<{ tickets: Ticket[] }>('GET', '/tickets/mine');
      setTickets(data.tickets);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function handleCreated(ticket: Ticket) {
    setTickets((prev) => (prev ? [ticket, ...prev] : [ticket]));
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Tickets</h1>
        <p className="mt-1 text-sm text-ink-muted">All tickets you have submitted, with their latest status.</p>
      </div>

      <NewTicketForm onCreated={handleCreated} />

      <section>
        <h2 className="text-lg font-semibold">Your tickets</h2>

        {loading && (
          <p className="mt-3 flex items-center gap-3 text-ink-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
            Loading your tickets…
          </p>
        )}

        {!loading && loadError && (
          <div className="mt-3 space-y-3">
            <Banner kind="error">{loadError}</Banner>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && tickets && tickets.length === 0 && (
          <p className="mt-3 rounded border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            You haven't created any tickets yet. Use the form above to submit your first one.
          </p>
        )}

        {!loading && !loadError && tickets && tickets.length > 0 && (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {tickets.map((t) => (
              <li key={t._id}>
                <Link
                  to={`/tickets/${t._id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-border/30 focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-ink-muted">{t.ticketNumber}</p>
                    <p className="truncate text-sm font-medium text-ink">{t.subject}</p>
                    <p className="font-mono text-xs text-ink-muted">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}