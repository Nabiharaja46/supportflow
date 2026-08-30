import mongoose from 'mongoose';

/**
 * User — Phase 1 spec, exact fields only:
 * { name, email (unique, required), passwordHash, role: "customer" | "agent"
 *   (required, no default — must be explicitly set at registration) }
 *
 * NOTE: no timestamps on User per spec; no extra fields.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['customer', 'agent'],
      required: true, // no default — must be explicitly set
    },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        // passwordHash must never appear in any API response.
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('User', userSchema);