import { useState } from 'react';
import { ApiError, type Ticket, type TicketStatus } from '../api/client';
import Banner from './Banner';

const NEXT_STATUS: Record<string, TicketStatus> = {
  New: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Resolved',
};

interface StatusAction {
  kind: 'idle' | 'busy' | 'success';
  label?: string;
  error?: string;
  successMessage?: string;
}

export default function TicketStatusControl({
  ticket,
  onUpdate,
}: {
  ticket: Ticket;
  onUpdate: (t: Ticket) => void;
}) {
  const [statusAction, setStatusAction] = useState<StatusAction>({ kind: 'idle' });
  const [resolveNote, setResolveNote] = useState('');

  async function moveStatus(next: TicketStatus) {
    setStatusAction({ kind: 'busy', label: 'Updating status…' });
    try {
      const body: Record<string, unknown> = { status: next };
      if (next === 'Resolved') body.resolutionNote = resolveNote;
      const data = await fetch(`${import.meta.env.VITE_API_URL}/tickets/${ticket._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sf_token') ?? ''}`,
        },
        body: JSON.stringify(body),
      });
      if (!data.ok) {
        const j = await data.json().catch(() => null);
        throw new ApiError(data.status, (j && j.message) || `HTTP ${data.status}`);
      }
      const d = await data.json();
      onUpdate(d.ticket);
      setResolveNote('');
      setStatusAction({ kind: 'success', successMessage: `Ticket ${next.toLowerCase()}.` });
      setTimeout(() => setStatusAction({ kind: 'idle' }), 3000);
    } catch (err) {
      setStatusAction({
        kind: 'busy',
        error: err instanceof ApiError ? err.message : 'Failed to update the status.',
      });
    }
  }

  function setStatusIdle() {
    setStatusAction({ kind: 'idle' });
  }

  async function reopen() {
    setStatusAction({ kind: 'busy', label: 'Reopening…' });
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/tickets/${ticket._id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sf_token') ?? ''}`,
        },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new ApiError(res.status, (j && j.message) || `HTTP ${res.status}`);
      }
      const d = await res.json();
      onUpdate(d.ticket);
      setStatusAction({ kind: 'success', successMessage: 'Ticket reopened.' });
      setTimeout(() => setStatusAction({ kind: 'idle' }), 3000);
    } catch (err) {
      setStatusAction({
        kind: 'busy',
        error: err instanceof ApiError ? err.message : 'Failed to reopen the ticket.',
      });
    }
  }

  if (!ticket) return null;

  const nextLabel = NEXT_STATUS[ticket.status];
  return (
    <div>
      <p className="text-xs text-ink-muted">
        Current: <span className="text-ink font-medium">{ticket.status}</span>
      </p>
      {statusAction.successMessage && (
        <div className="mt-2 text-sm text-success">
          {statusAction.successMessage}
        </div>
      )}
      {statusAction.error && (
        <div className="mt-2">
          <Banner kind="error" onDismiss={setStatusIdle}>{statusAction.error}</Banner>
        </div>
      )}
      {ticket.status !== 'Resolved' ? (
        <div className="mt-3">
          {nextLabel === 'Resolved' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="resolve-note" className="block text-xs text-ink-muted">
                  Resolution note (required to mark Resolved)
                </label>
                <textarea
                  id="resolve-note"
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  placeholder="What fixed the issue?"
                />
              </div>
              <button
                type="button"
                onClick={() => void moveStatus('Resolved')}
                disabled={statusAction.kind === 'busy' || !resolveNote.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                {statusAction.kind === 'busy' ? (statusAction.label ?? 'Saving…') : 'Mark Resolved'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void moveStatus(nextLabel!)}
              disabled={statusAction.kind === 'busy'}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              {statusAction.kind === 'busy' ? (statusAction.label ?? 'Updating…') : `Move to ${nextLabel}`}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void reopen()}
            disabled={statusAction.kind === 'busy'}
            className="rounded border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-border disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            {statusAction.kind === 'busy' ? (statusAction.label ?? 'Reopening…') : 'Reopen ticket'}
          </button>
        </div>
      )}
    </div>
  );
}
