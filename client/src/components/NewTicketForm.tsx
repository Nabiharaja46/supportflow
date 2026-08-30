import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Ticket } from '../api/client';
import Banner from './Banner';

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; ticket: Ticket }
  | { kind: 'error'; message: string };

const inputCls =
  'mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2';

export default function NewTicketForm({ onCreated }: { onCreated: (ticket: Ticket) => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<{ subject?: string; description?: string }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: { subject?: string; description?: string } = {};
    if (!subject.trim()) errors.subject = 'Subject is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    setFieldErrors(errors);
    if (errors.subject || errors.description) return;

    setState({ kind: 'submitting' });
    try {
      const data = await api<{ ticket: Ticket }>('POST', '/tickets', {
        body: {
          subject: subject.trim(),
          description: description.trim(),
          // category is optional — only sent when the customer filled it in
          ...(category.trim() ? { category: category.trim() } : {}),
        },
      });
      setState({ kind: 'success', ticket: data.ticket });
      setSubject('');
      setDescription('');
      setCategory('');
      onCreated(data.ticket);
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to create the ticket. Please try again.',
      });
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">New Ticket</h2>
      <p className="mt-1 text-sm text-ink-muted">Describe the issue and our agents will take it from there.</p>

      {state.kind === 'success' && (
        <div className="mt-4">
          <Banner kind="success" onDismiss={() => setState({ kind: 'idle' })}>
            Ticket <span className="font-mono font-semibold">{state.ticket.ticketNumber}</span> created successfully.{' '}
            <Link to={`/tickets/${state.ticket._id}`} className="underline hover:text-success/80">
              View ticket
            </Link>
          </Banner>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="mt-4">
          <Banner kind="error" onDismiss={() => setState({ kind: 'idle' })}>
            {state.message}
          </Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor="subject" className="block text-sm text-ink-muted">
            Subject
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputCls}
            placeholder="e.g. Laptop won't start"
            aria-invalid={!!fieldErrors.subject}
          />
          {fieldErrors.subject && <p className="mt-1 text-xs text-error">{fieldErrors.subject}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm text-ink-muted">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="What happened? What did you already try?"
            aria-invalid={!!fieldErrors.description}
          />
          {fieldErrors.description && <p className="mt-1 text-xs text-error">{fieldErrors.description}</p>}
        </div>
        <div>
          <label htmlFor="category" className="block text-sm text-ink-muted">
            Category <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
            placeholder="e.g. Hardware, Billing, Network"
          />
        </div>
        <button
          type="submit"
          disabled={state.kind === 'submitting'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          {state.kind === 'submitting' ? 'Creating ticket…' : 'Create ticket'}
        </button>
      </form>
    </section>
  );
}