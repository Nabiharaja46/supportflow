import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type Ticket } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';

type StatusAction =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'error'; message: string };
type TriageAction =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const NEXT_STATUS: Record<string, string> = {
  New: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Resolved',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusAction, setStatusAction] = useState<StatusAction>({ kind: 'idle' });
  const [resolveNote, setResolveNote] = useState('');

  const [triageCategory, setTriageCategory] = useState('');
  const [triagePriority, setTriagePriority] = useState('');
  const [triageAction, setTriageAction] = useState<TriageAction>({ kind: 'idle' });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setTriageAction({ kind: 'idle' });
    try {
      const data = await api<{ ticket: Ticket }>('GET', `/tickets/${id}`);
      setTicket(data.ticket);
      setTriageCategory(data.ticket.aiSuggestion?.category ?? '');
      setTriagePriority(data.ticket.aiSuggestion?.priority ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveStatus(next: string) {
    if (!ticket) return;
    setStatusAction({ kind: 'busy', label: 'Updating status…' });
    try {
      const body: Record<string, unknown> = { status: next };
      if (next === 'Resolved') body.resolutionNote = resolveNote;
      const data = await api<{ ticket: Ticket }>('PATCH', `/tickets/${ticket._id}/status`, { body });
      setTicket(data.ticket);
      setResolveNote('');
      setStatusAction({ kind: 'idle' });
    } catch (err) {
      setStatusAction({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to update the status.',
      });
    }
  }

  async function reopen() {
    if (!ticket) return;
    setStatusAction({ kind: 'busy', label: 'Reopening…' });
    try {
      const data = await api<{ ticket: Ticket }>('POST', `/tickets/${ticket._id}/reopen`);
      setTicket(data.ticket);
      setStatusAction({ kind: 'idle' });
    } catch (err) {
      setStatusAction({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to reopen the ticket.',
      });
    }
  }

  async function submitTriage(e: FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setTriageAction({ kind: 'busy' });
    try {
      const data = await api<{ ticket: Ticket }>('PATCH', `/tickets/${ticket._id}/triage`, {
        body: { category: triageCategory, priority: triagePriority },
      });
      setTicket(data.ticket);
      setTriageAction({ kind: 'success', message: 'Triage saved — category and priority are now final.' });
    } catch (err) {
      setTriageAction({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to save triage. Please try again.',
      });
    }
  }

  const cell = 'rounded-lg border border-slate-800 bg-slate-950/50 p-3';
  const label = 'text-xs uppercase tracking-wide text-slate-500';
  const backTo = isAgent ? '/agent' : '/tickets';
  const backLabel = isAgent ? 'Back to queue' : 'Back to My Tickets';

  return (
    <div>
      <Link to={backTo} className="text-sm text-sky-400 hover:text-sky-300">
        ← {backLabel}
      </Link>

      {loading && (
        <p className="mt-6 flex items-center gap-3 text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
          Loading ticket…
        </p>
      )}

      {error && (
        <div className="mt-6 max-w-2xl">
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {ticket && (
        <article className="mt-4 max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-lg text-sky-300">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
          </div>

          <h1 className="mt-3 text-xl font-semibold text-slate-100">{ticket.subject}</h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{ticket.description}</p>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={cell}>
              <dt className={label}>Category</dt>
              {/* Until /triage is saved, the real fields are blank — never show the AI guess as final */}
              <dd className="mt-1 text-sm text-slate-200">{ticket.category ?? 'Not yet triaged'}</dd>
            </div>
            <div className={cell}>
              <dt className={label}>Priority</dt>
              <dd className="mt-1 text-sm text-slate-200">{ticket.priority ?? 'Not yet triaged'}</dd>
            </div>
            <div className={cell}>
              <dt className={label}>Created</dt>
              <dd className="mt-1 text-sm text-slate-200">{new Date(ticket.createdAt).toLocaleString()}</dd>
            </div>
            <div className={cell}>
              <dt className={label}>Last updated</dt>
              <dd className="mt-1 text-sm text-slate-200">{new Date(ticket.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>

          {ticket.status === 'Resolved' && ticket.resolutionNote && (
            <div className="mt-6">
              <Banner kind="success">
                <span className="font-semibold">Resolution note:</span> {ticket.resolutionNote}
              </Banner>
            </div>
          )}

          {isAgent && (
            <div className="mt-6 space-y-6 border-t border-slate-800 pt-6">
              {renderAgentPanel({
                ticket,
                statusAction,
                resolveNote,
                setResolveNote,
                moveStatus,
                reopen,
                triageAction,
                triageCategory,
                setTriageCategory,
                triagePriority,
                setTriagePriority,
                submitTriage,
              })}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

interface AgentPanelProps {
  ticket: Ticket;
  statusAction: StatusAction;
  resolveNote: string;
  setResolveNote: (v: string) => void;
  moveStatus: (next: string) => Promise<void>;
  reopen: () => Promise<void>;
  triageAction: TriageAction;
  triageCategory: string;
  setTriageCategory: (v: string) => void;
  triagePriority: string;
  setTriagePriority: (v: string) => void;
  submitTriage: (e: FormEvent) => Promise<void>;
}

function renderAgentPanel(p: AgentPanelProps) {
  const ticket = p.ticket;
  return (
    <>
      {/* ---- AI Suggestion panel ---- */}
      <section className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">AI Suggestion</h2>
        {ticket.aiSuggestion ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="text-slate-400">Category:</span>{' '}
              <span className="text-slate-200">{ticket.aiSuggestion.category}</span>
            </p>
            <p>
              <span className="text-slate-400">Priority:</span>{' '}
              <span
                className={`font-medium ${
                  ticket.aiSuggestion.priority === 'High'
                    ? 'text-rose-300'
                    : ticket.aiSuggestion.priority === 'Medium'
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }`}
              >
                {ticket.aiSuggestion.priority}
              </span>
            </p>
            <p>
              <span className="text-slate-400">Summary:</span>{' '}
              <span className="text-slate-300">{ticket.aiSuggestion.summary}</span>
            </p>
            <p className="pt-1 text-xs text-slate-500">
              Advisory only — review and edit below, then save to finalize.
            </p>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-indigo-500/30 p-3 text-sm text-amber-300">
            AI suggestion unavailable — please triage manually.
          </p>
        )}
      </section>

      {/* ---- Triage form ---- */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Finalize triage</h2>
        <p className="mt-1 text-xs text-slate-500">
          Saving writes the ticket&apos;s real category and priority{' '}
          ({ticket.category ? 'currently finalized' : 'not yet triaged'}).
        </p>
        {p.triageAction.kind === 'success' && (
          <div className="mt-3">
            <Banner kind="success">{p.triageAction.message}</Banner>
          </div>
        )}
        {p.triageAction.kind === 'error' && (
          <div className="mt-3">
            <Banner kind="error">{p.triageAction.message}</Banner>
          </div>
        )}
        <form onSubmit={(e) => void p.submitTriage(e)} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="triage-category" className="block text-xs text-slate-300">
              Category
            </label>
            <input
              id="triage-category"
              value={p.triageCategory}
              onChange={(e) => p.setTriageCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="e.g. Hardware"
              required
            />
          </div>
          <div>
            <label htmlFor="triage-priority" className="block text-xs text-slate-300">
              Priority
            </label>
            <select
              id="triage-priority"
              value={p.triagePriority}
              onChange={(e) => p.setTriagePriority(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
              required
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={p.triageAction.kind === 'busy'}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {p.triageAction.kind === 'busy' ? 'Saving…' : 'Save triage'}
            </button>
          </div>
        </form>
      </section>

      {/* ---- Status controls ---- */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Status</h2>
        <p className="mt-1 text-xs text-slate-500">
          Current: <span className="text-slate-300">{ticket.status}</span>
        </p>
        {p.statusAction.kind === 'error' && (
          <div className="mt-3">
            <Banner kind="error">{p.statusAction.message}</Banner>
          </div>
        )}
        {ticket.status !== 'Resolved' ? (
          <div className="mt-3">
            {NEXT_STATUS[ticket.status] === 'Resolved' ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="resolve-note" className="block text-xs text-slate-300">
                    Resolution note (required to mark Resolved)
                  </label>
                  <textarea
                    id="resolve-note"
                    rows={3}
                    value={p.resolveNote}
                    onChange={(e) => p.setResolveNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-sky-500"
                    placeholder="What fixed the issue?"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void p.moveStatus('Resolved')}
                  disabled={p.statusAction.kind === 'busy' || !p.resolveNote.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {p.statusAction.kind === 'busy' ? p.statusAction.label : 'Mark Resolved'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void p.moveStatus(NEXT_STATUS[ticket.status])}
                disabled={p.statusAction.kind === 'busy'}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {p.statusAction.kind === 'busy' ? p.statusAction.label : `Move to ${NEXT_STATUS[ticket.status]}`}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void p.reopen()}
              disabled={p.statusAction.kind === 'busy'}
              className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {p.statusAction.kind === 'busy' ? p.statusAction.label : 'Reopen ticket'}
            </button>
          </div>
        )}
      </section>
    </>
  );
}