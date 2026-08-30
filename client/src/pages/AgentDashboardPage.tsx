import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Ticket, type TicketPriority, type TicketStatus } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';

const STATUS_FILTERS: (TicketStatus | 'all')[] = ['all', 'New', 'Assigned', 'In Progress', 'Resolved'];
const PRIORITY_FILTERS: (TicketPriority | 'all')[] = ['all', 'Low', 'Medium', 'High'];

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  priorityUnset: number;
}

const EMPTY_STATS: Stats = {
  total: 0,
  byStatus: { New: 0, Assigned: 0, 'In Progress': 0, Resolved: 0 },
  byPriority: { Low: 0, Medium: 0, High: 0 },
  priorityUnset: 0,
};

export default function AgentDashboardPage() {
      const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [statusFilter, priorityFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<{ tickets: Ticket[] }>('GET', `/tickets/queue${query}`);
      setTickets(data.tickets);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load the ticket list.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await api<Stats>('GET', '/stats');
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof ApiError ? err.message : 'Failed to load statistics.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadStats();
  }, [load, loadStats]);

  const canClaim = (t: Ticket) => !t.assignedAgentId;

    async function claim(ticketId: string) {
    try {
      await api('POST', `/tickets/${ticketId}/assign`);
      void load();
      void loadStats();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to claim the ticket.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agent Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">All tickets — assign, triage, and resolve.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col text-xs text-ink-muted">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
              className="mt-1 rounded border border-border bg-surface px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs text-ink-muted">
            Priority
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
              className="mt-1 rounded border border-border bg-surface px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {PRIORITY_FILTERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border disabled:opacity-50 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Statistics</h2>
        {statsLoading && <p className="mt-2 text-sm text-ink-muted">Loading statistics…</p>}
        {statsError && <p className="mt-2 text-sm text-error">{statsError}</p>}
        {!statsLoading && !statsError && (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs text-ink-muted">Total</p>
              <p className="text-xl font-semibold text-ink">{stats.total}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">New</p>
              <p className="text-xl font-semibold text-ink">{stats.byStatus.New ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">In Progress</p>
              <p className="text-xl font-semibold text-ink">{stats.byStatus['In Progress'] ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Resolved</p>
              <p className="text-xl font-semibold text-ink">{stats.byStatus.Resolved ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Priority unset</p>
              <p className="text-xl font-semibold text-ink">{stats.priorityUnset}</p>
            </div>
          </div>
        )}
      </section>

      {loading && (
        <p className="flex items-center gap-3 text-ink-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
          Loading tickets…
        </p>
      )}

      {!loading && loadError && (
        <div className="space-y-3">
          <Banner kind="error">{loadError}</Banner>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && tickets && tickets.length === 0 && (
        <p className="rounded border border-dashed border-border p-6 text-center text-sm text-ink-muted">
          No tickets match the current filters.
        </p>
      )}

      {!loading && !loadError && tickets && tickets.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-border/30">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Ticket</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Subject</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Status</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Priority</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Category</th>
                <th className="px-4 py-2 text-left font-medium text-ink-muted">Assigned</th>
                <th className="px-4 py-2 text-right font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t._id} className="hover:bg-border/30">
                  <td className="px-4 py-2 font-mono text-xs text-ink-muted">{t.ticketNumber}</td>
                  <td className="px-4 py-2 text-ink">{t.subject}</td>
                  <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-2">{t.priority ? (
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      t.priority === 'High' ? 'text-priority-high bg-priority-high/15' :
                      t.priority === 'Medium' ? 'text-priority-medium bg-priority-medium/15' :
                      'text-priority-low bg-priority-low/15'
                    }`}>{t.priority}</span>
                  ) : <span className="italic text-ink-muted">Not set</span>}</td>
                  <td className="px-4 py-2">{t.category ?? <span className="italic text-ink-muted">Not triaged</span>}</td>
                  <td className="px-4 py-2 text-ink-muted">
                    {t.assignedAgentId ? 'Assigned' : <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canClaim(t) && (
                      <button
                        type="button"
                        onClick={() => void claim(t._id)}
                        className="rounded border border-border px-2.5 py-1 text-xs text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      >
                        Claim
                      </button>
                    )}
                    {!canClaim(t) && (
                      <Link
                        to={`/agent/tickets/${t._id}`}
                        className="rounded border border-border px-2.5 py-1 text-xs text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      >
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

