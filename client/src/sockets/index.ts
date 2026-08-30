import { io, type Socket } from 'socket.io-client';
import type { Message, Ticket } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string | undefined;

class TicketSocket {
    private socket: Socket | null = null;
  private handlers: Set<(msg: Message) => void> = new Set();
  private ticketHandlers: Set<(ticket: Ticket) => void> = new Set();

    connect(ticketId: string, token: string): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (!SOCKET_URL) {
      console.warn('[supportflow] VITE_SOCKET_URL is not set; real-time is disabled.');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join-ticket', ticketId);
    });

    this.socket.on('new-message', (msg: Message) => {
      this.handlers.forEach((h) => h(msg));
    });

    this.socket.on('ticket-updated', (ticket: Ticket) => {
      this.ticketHandlers.forEach((h) => h(ticket));
    });
  }

  onMessage(handler: (msg: Message) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onTicketUpdate(handler: (ticket: Ticket) => void): () => void {
    this.ticketHandlers.add(handler);
    return () => this.ticketHandlers.delete(handler);
  }

    disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers.clear();
    this.ticketHandlers.clear();
  }
}

export const ticketSocket = new TicketSocket();
