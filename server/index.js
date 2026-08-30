import http from 'http';
import app from './src/app.js';
import env from './src/config/env.js';
import { connectDB } from './src/db/connect.js';
import { attachSocket } from './src/sockets/index.js';

async function start() {
  // 1) Try MongoDB — loud success/failure either way.
  const dbOk = await connectDB();

  // 2) Attach Socket.IO to a real HTTP server (shares port with Express).
  const server = http.createServer(app);
  const io = attachSocket(server);
  app.set('io', io);

  // 3) Start the API regardless so phase-0 health check still works
  //    when Mongo isn't configured yet (just warn loudly).
  server.listen(env.PORT, () => {
    console.log(`[supportflow] ✅ API listening on http://localhost:${env.PORT}`);
    console.log(`[supportflow] ✅ Socket.IO ready on ws://localhost:${env.PORT}`);
    if (!dbOk) {
      console.warn(
        '[supportflow] ⚠️ Server is up, but MongoDB is NOT connected. ' +
          'Set MONGO_URI in /server/.env.'
      );
    }
  });
}

start();