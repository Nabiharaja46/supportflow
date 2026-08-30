import mongoose from 'mongoose';

/**
 * Internal counter for atomic ticket-number generation.
 * Not part of the public Phase 1 schema list — it never appears in any response.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);