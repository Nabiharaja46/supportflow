import 'dotenv/config';

/**
 * Central place that reads every server-side secret.
 * IMPORTANT: nothing from here is ever exported to /client.
 */
const env = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

const REQUIRED = ['MONGO_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missing = REQUIRED.filter((key) => !env[key]);

if (missing.length > 0) {
  console.warn(
    `[supportflow] ⚠️ Missing env var(s) — add them to /server/.env: ${missing.join(', ')}`
  );
}

export default env;