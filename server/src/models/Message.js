import mongoose from 'mongoose';

/**
 * Message — Phase 1 spec, exact fields only:
 * { ticketId (ref Ticket, required), senderId (ref User, required),
 *   senderRole: "customer" | "agent" (required), body (required), createdAt }
 */
const messageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'agent'],
      required: true,
    },
    body: { type: String, required: true },
  },
  {
    // Spec lists only createdAt for Message — no updatedAt.
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('Message', messageSchema);