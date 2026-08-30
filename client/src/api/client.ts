export type TicketStatus = 'New' | 'Assigned' | 'In Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High';

export interface Ticket {
  _id: string;
  ticketNumber: string;
  customerId: string;
  customer?: { name: string; email: string } | null;
  subject: string;
  description: string;
  category: string | null;
  priority: TicketPriority | null;
  status: TicketStatus;
  assignedAgentId: string | null;
  aiSuggestion: {
    category: string | null;
    priority: string | null;
    summary: string | null;
  } | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  ticketId: string;
  senderId: string;
  senderRole: 'customer' | 'agent';
  body: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'agent';
}

export interface Stats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  priorityUnset: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const TOKEN_KEY = 'sf_token';
const USER_KEY = 'sf_user';

export function getStoredSession(): { token: string; user: SessionUser } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (token && rawUser) {
      return { token, user: JSON.parse(rawUser) as SessionUser };
    }
  } catch {
    // corrupted storage — treat as signed out
  }
  return null;
}

export function storeSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

interface ApiOptions {
  body?: unknown;
  auth?: boolean;
}

/** Thin fetch wrapper: JSON in/out, bearer token, specific error messages. */
export async function api<T>(method: string, path: string, { body, auth = true }: ApiOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(-1, 'VITE_API_URL is not set in /client/.env');
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? localStorage.getItem(TOKEN_KEY) : null;
  if (auth) {
    if (!token) throw new ApiError(401, 'You are signed out. Please log in again.');
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    const requestBody = body !== undefined ? JSON.stringify(body) : undefined;
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: requestBody,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the SupportFlow API at ${API_URL}. Is the server running?`);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    // Expired/invalid token on an authenticated call: sign out cleanly.
    if (res.status === 401 && auth && token) {
      clearStoredSession();
      window.location.assign('/login');
    }
    const serverMessage =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : null;
    throw new ApiError(res.status, serverMessage ?? `Request failed (HTTP ${res.status})`);
  }

  return data as T;
}