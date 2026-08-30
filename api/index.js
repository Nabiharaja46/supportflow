import app from './src/app.js';
import { connectDB } from './src/db/connect.js';

let dbConnected = false;

// Serverless: cache DB connection across invocations
async function ensureDB() {
  if (!dbConnected) {
    dbConnected = await connectDB();
  }
  return dbConnected;
}

// Middleware to ensure DB is connected before each request
app.use(async (req, res, next) => {
  await ensureDB();
  next();
});

// Export for Vercel serverless
export default app;