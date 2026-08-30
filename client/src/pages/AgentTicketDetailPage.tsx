import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type Ticket, type Message, type TicketPriority } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';
import MessageThread from '../components/MessageThread';
import ReplyBox from '../components/ReplyBox';
import TicketStatusControl from '../components/TicketStatusControl';
import { ticketSocket } from '../sockets/index';

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High'];

interface TriageActionState {
  kind: 'idle' | 'submitting';
  message?: string;
}

export default function AgentTicketDetailPage() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() ?? '' : '';
  const { token, user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [triageCategory, setTriageCategory] = useState('');
  const [triagePriority, setTriagePriority] = useState('');
  const [triageAction, setTriageAction] = useState<TriageActionState>({ kind: 'idle' });

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const t = await api<{ ticket: Ticket }>('GET', `/tickets/${id}`);
      setTicket(t.ticket);
      setTriageCategory(t.ticket.aiSuggestion?.category ?? '');
      setTriagePriority(t.ticket.aiSuggestion?.priority ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    setMsgLoading(true);
    try {
      const m = await api<{ messages: Message[] }>('GET', `/tickets/${id}/messages`);
      setMessages(m.messages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages.');
    } finally {
      setMsgLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTicket();
    void loadMessages();
  }, [loadTicket, loadMessages]);

  useEffect(() => {
    if (!token || !id) return;
    ticketSocket.connect(id, token);
    const unsubMsg = ticketSocket.onMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    const unsubTicket = ticketSocket.onTicketUpdate((t) => {
      setTicket(t);
    });
    return () => {
      unsubMsg();
      unsubTicket();
      ticketSocket.disconnect();
    };
  }, [token, id]);

  async function sendReply(text: string) {
    const data = await api<{ message: Message }>('POST', `/tickets/${id}/messages`, { body: text });
    setMessages((prev) => [...prev, data.message]);
  }

  async function submitTriage(e: FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setTriageAction({ kind: 'submitting' });
    try {
      const data = await api<{ ticket: Ticket }>('PATCH', `/tickets/${ticket._id}/triage`, {
        category: triageCategory.trim(),
        priority: triagePriority,
      });
      setTicket(data.ticket);
      setTriageAction({ kind: 'idle' });
    } catch (err) {
      setTriageAction({
        kind: 'idle',
        message: err instanceof ApiError ? err.message : 'Failed to save triage. Please try again.',
      });
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-3 text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
        Loading ticket…
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Banner kind="error">{error}</Banner>
        <button
          type="button"
          onClick={() => { void loadTicket(); void loadMessages(); }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) return null;
  const isAgent = user?.role === 'agent';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <span className="font-mono text-sm text-ink-muted">{ticket.ticketNumber}</span>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          {ticket.priority && (
            <span className="rounded px-2 py-0.5 text-xs text-priority-high bg-priority-high/15">{ticket.priority}</span>
          )}
          {!ticket.priority && <span className="text-xs italic text-ink-muted">Priority: Not yet set</span>}
        </div>
      </div>

      {ticket.aiSuggestion && (
        <section className="rounded-card border border-dashed border-ai bg-ai-bg p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ai">AI SUGGESTION · UNCONFIRMED</h2>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-ink-muted">Category:</span> {ticket.aiSuggestion.category ?? 'N/A'}</p>
            <p><span className="text-ink-muted">Priority:</span> {ticket.aiSuggestion.priority ?? 'N/A'}</p>
            <p><span className="text-ink-muted">Summary:</span> {ticket.aiSuggestion.summary ?? 'N/A'}</p>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Advisory only. Use the triage form below to set the real category and priority.
          </p>
        </section>
      )}

      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Triage</h2>
        {!ticket.category && <p className="mt-1 text-xs italic text-ink-muted">Not yet triaged.</p>}
        {triageAction.message && (
          <Banner kind="error" onDismiss={() => setTriageAction({ kind: 'idle' })}>{triageAction.message}</Banner>
        )}
        <form onSubmit={submitTriage} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="triage-category" className="block text-xs text-ink-muted">Category</label>
            <input
              id="triage-category"
              type="text"
              value={triageCategory}
              onChange={(e) => setTriageCategory(e.target.value)}
              disabled={triageAction.kind === 'submitting'}
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              placeholder="e.g. Billing, Hardware, Network"
            />
          </div>
          <div>
            <label htmlFor="triage-priority" className="block text-xs text-ink-muted">Priority</label>
            <select
              id="triage-priority"
              value={triagePriority}
              onChange={(e) => setTriagePriority(e.target.value)}
              disabled={triageAction.kind === 'submitting'}
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <option value="">Select a priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={triageAction.kind === 'submitting'}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {triageAction.kind === 'submitting' ? 'Saving…' : 'Save triage'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Conversation</h2>
        {msgLoading && <p className="mt-2 text-sm text-ink-muted">Loading messages…</p>}
        {!msgLoading && <MessageThread messages={messages} currentUserId={user?.id ?? ''} />}
      </section>

      {isAgent && (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Reply</h2>
          <ReplyBox onSend={sendReply} />
        </section>
      )}

      {isAgent && (
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Status</h2>
          <TicketStatusControl ticket={ticket} onUpdate={setTicket} />
        </section>
      )}
    </div>
  );
}
