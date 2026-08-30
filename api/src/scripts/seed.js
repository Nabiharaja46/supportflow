// Demo-account seed (Phase 1). Phase 7 will expand this into full seeding.
// Demo credentials are intentionally known and documented (they are not secrets):
//   agent    agent@supportflow.demo    / SupportFlowAgent!1
//   customer customer@supportflow.demo / SupportFlowCustomer!1
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db/connect.js';
import User from '../models/User.js';

const DEMO_USERS = [
  { name: 'Demo Agent', email: 'agent@supportflow.demo', password: 'SupportFlowAgent!1', role: 'agent' },
  { name: 'Demo Customer', email: 'customer@supportflow.demo', password: 'SupportFlowCustomer!1', role: 'customer' },
];

async function seed() {
  const connected = await connectDB();
  if (!connected) {
    console.error('[seed] ❌ Mongo connect failed — set MONGO_URI in /server/.env.');
    process.exit(1);
  }

  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ email: demo.email });
    if (existing) {
      console.log(`[seed] ⏭️  ${demo.email} already exists (role=${existing.role}) — skipped`);
      continue;
    }
    const passwordHash = await bcrypt.hash(demo.password, 10);
    await User.create({ name: demo.name, email: demo.email, role: demo.role, passwordHash });
    console.log(`[seed] ✅ Created ${demo.role.padEnd(8)} ${demo.email}`);
  }

  console.log('\n[seed] Demo credentials:');
  for (const demo of DEMO_USERS) {
    console.log(`  ${demo.role.padEnd(8)} ${demo.email}  /  ${demo.password}`);
  }

  await mongoose.disconnect();
}

seed();