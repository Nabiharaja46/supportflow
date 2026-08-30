import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Ticket, type Message } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';
import MessageThread from '../components/MessageThread';
import ReplyBox from '../components/ReplyBox';
import { ticketSocket } from '../sockets/index';

export default function CustomerTicketDetailPage() {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() ?? '' : '';
  const { token, user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const t = await api<{ ticket: Ticket }>('GET', `/tickets/${id}`);
      setTicket(t.ticket);
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

  // Socket.IO: join room, receive live messages and live ticket updates.
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

  if (loading) {
    return (
      <p className="flex items-center gap-3 text-ink-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
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
          className="rounded border border-border px-3 py-1.5 text-sm text-ink hover:bg-border focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) return null;

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
            <span className={`rounded px-2 py-0.5 text-xs ${
              ticket.priority === 'High' ? 'text-priority-high bg-priority-high/15' :
              ticket.priority === 'Medium' ? 'text-priority-medium bg-priority-medium/15' :
              'text-priority-low bg-priority-low/15'
            }`}>{ticket.priority}</span>
          )}
          {!ticket.priority && <span className="text-xs italic text-ink-muted">Priority: Not yet set</span>}
        </div>
        {ticket.category && <p className="mt-1 text-sm text-ink-muted">Category: {ticket.category}</p>}
        {!ticket.category && <p className="mt-1 text-sm italic text-ink-muted">Category: Not yet triaged</p>}
      </div>

      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Conversation</h2>
        {msgLoading && <p className="mt-2 text-sm text-ink-muted">Loading messages…</p>}
        {!msgLoading && <MessageThread messages={messages} currentUserId={user?.id ?? ''} />}
      </section>

      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Reply</h2>
        <ReplyBox onSend={sendReply} />
      </section>
    </div>
  );
}
