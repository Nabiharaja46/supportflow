import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import ticketsRouter from './routes/tickets.js';
import statsRouter from './routes/stats.js';

const app = express();

// Only the browser origin defined by CLIENT_URL is allowed in.
app.use(cors({ origin: env.CLIENT_URL }));

// JSON body parsing (used from later phases onward)
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/stats', statsRouter);

// Socket.IO handle is attached by index.js (it needs the raw HTTP server).
// Routes/handlers read it from app.get('io') when they need to emit.
app.set('io', null);

// Central error handler — auth routes pass errors here.
app.use((err, _req, res, _next) => {
  console.error('[supportflow] Unhandled error:', err);
  res.status(err.status || 500).json({ message: 'Internal server error' });
});

export default app;