import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';

export default function ReplyBox({
  onSend,
}: {
  onSend: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: 'idle' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;
    setSubmitting(true);
    setResult({ kind: 'idle' });
    try {
      await onSend(trimmedBody);
      setBody('');
      setResult({ kind: 'idle' });
    } catch (err) {
      setResult({ kind: 'error', message: err instanceof ApiError ? err.message : 'Failed to send the message.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="reply-body" className="block text-xs text-ink-muted">
          Reply
        </label>
        <textarea
          id="reply-body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={submitting}
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          placeholder="Type your reply…"
          aria-disabled={submitting}
        />
        {result.kind === 'error' && <p className="mt-1 text-xs text-error">{result.message}</p>}
      </div>
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        {submitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
