import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import Banner from '../components/Banner';

const inputCls =
  'mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'agent' ? '/agent' : '/tickets', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-8 text-ink">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight">SupportFlow</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to your account</p>

        {error && (
          <div className="mt-4">
            <Banner kind="error">{error}</Banner>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputCls}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-ink-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 rounded border border-border bg-border/30 p-3 text-xs text-ink-muted">
          <p className="font-medium text-ink">Demo accounts (click to fill)</p>
          <button
            type="button"
            onClick={() => {
              setEmail('customer@supportflow.demo');
              setPassword('SupportFlowCustomer!1');
            }}
            className="mt-1 block hover:text-ink focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            customer@supportflow.demo — customer
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('agent@supportflow.demo');
              setPassword('SupportFlowAgent!1');
            }}
            className="block hover:text-ink focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            agent@supportflow.demo — agent
          </button>
        </div>
      </div>
    </div>
  );
}