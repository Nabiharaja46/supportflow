import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './auth/AuthContext';
import Shell from './components/Shell';
import LoginPage from './pages/LoginPage';
import MyTicketsPage from './pages/MyTicketsPage';
import CustomerTicketDetailPage from './pages/CustomerTicketDetailPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import AgentTicketDetailPage from './pages/AgentTicketDetailPage';

/** Route guard: requires a session, and (optionally) a specific role. */
function RequireRole({ role, children }: { role?: 'customer' | 'agent'; children: ReactElement }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'agent' ? '/agent' : '/tickets'} replace />;
  }
  return <Shell>{children}</Shell>;
}

function HomeRedirect() {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'agent' ? '/agent' : '/tickets'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/tickets"
        element={
          <RequireRole role="customer">
            <MyTicketsPage />
          </RequireRole>
        }
      />
            <Route
        path="/tickets/:id"
        element={
          <RequireRole role="customer">
            <CustomerTicketDetailPage />
          </RequireRole>
        }
      />
      <Route
        path="/agent"
        element={
          <RequireRole role="agent">
            <AgentDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/agent/tickets/:id"
        element={
          <RequireRole role="agent">
            <AgentTicketDetailPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}