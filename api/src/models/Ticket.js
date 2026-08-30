import mongoose from 'mongoose';
import { nextTicketNumber } from '../utils/ticketNumber.js';

// Embedded AI suggestion — nullable until the triage phase sets it.
// Declared as an explicit sub-schema so the whole block can default to null
// and carries no sub-document _id.
const aiSuggestionSchema = new mongoose.Schema(
  {
    category: { type: String, default: null },
    priority: { type: String, default: null },
    summary: { type: String, default: null },
  },
  { _id: false }
);

/**
 * Ticket — Phase 1 spec, exact fields only.
 * priority enum is FIXED: "Low" | "Medium" | "High" (nullable until finalized).
 * status enum is FIXED: "New" | "Assigned" | "In Progress" | "Resolved" (default "New").
 */
const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true, // backstop against collisions; generation is atomic via counter
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: null }, // nullable until agent finalizes triage
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'], // fixed — no other value allowed at schema level
      default: null, // nullable until finalized (mongoose enum skips null)
    },
    status: {
      type: String,
      enum: ['New', 'Assigned', 'In Progress', 'Resolved'],
      default: 'New',
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    aiSuggestion: {
      type: aiSuggestionSchema,
      default: null, // whole block nullable until the AI triage phase
    },
    resolutionNote: { type: String, default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Auto-generate the unique ticket number on first save, e.g. "TCK-1001".
// Runs pre-validate so the required check sees the generated value, and so
// EVERY creation path (current and future endpoints) is collision-free.
ticketSchema.pre('validate', async function () {
  if (this.isNew && !this.ticketNumber) {
    this.ticketNumber = await nextTicketNumber();
  }
});

export default mongoose.model('Ticket', ticketSchema);