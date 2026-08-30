import mongoose from 'mongoose';
import env from '../config/env.js';

/**
 * Connect to MongoDB on startup.
 * Never fails silently: always logs a clear success or failure message.
 * Returns true/false so the caller can decide what to do.
 */
export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(
      `[supportflow] ✅ MongoDB connected — host: ${mongoose.connection.host}`
    );
    return true;
  } catch (err) {
    console.error(
      `[supportflow] ❌ MongoDB connection FAILED: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return false;
  }
}