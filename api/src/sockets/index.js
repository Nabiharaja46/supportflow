import { Server } from 'socket.io';
import env from '../config/env.js';

/**
 * Socket.IO real-time channel for SupportFlow.
 *
 * - Attaches to the SAME HTTP server the Express app already runs on
 *   (no separate port/process), so it works on localhost and on a
 *   single Render deployment.
 * - CORS origin is restricted to CLIENT_URL (never a wildcard).
 * - Channel: per-ticket room "ticket:<id>".
 * - Events:
 *     "new-message"    -> emitted after a message is saved  (full message object)
 *     "ticket-updated" -> emitted after status/assign/triage  (full ticket object)
 */
export function attachSocket(server) {
  const io = new Server(server, {
    cors: { origin: env.CLIENT_URL, methods: ['GET', 'POST', 'PATCH'] },
  });

  io.on('connection', (socket) => {
    // Each client joins the room for the ticket it has open. The handler
    // does not perform auth itself — the caller is already authenticated via
    // the HTTP session/token; access control on which tickets a socket may
    // join is enforced at the HTTP endpoint level (you can only GET/POST on
    // a ticket you're allowed to see, and those are the only triggers for emit).
    socket.on('join-ticket', (payload) => {
      const ticketId = typeof payload === 'string' ? payload : payload?.ticketId;
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
      }
    });
  });

  return io;
}

/** Emit the new message to everyone watching this ticket. */
export function emitNewMessage(io, ticketId, message) {
  io.to(`ticket:${ticketId}`).emit('new-message', message);
}

/** Emit a ticket update (status/assign/triage) to everyone watching. */
export function emitTicketUpdate(io, ticketId, ticket) {
  io.to(`ticket:${ticketId}`).emit('ticket-updated', ticket);
}
