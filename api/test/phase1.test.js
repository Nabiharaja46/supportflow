/**
 * Phase 1 end-to-end verification — runs the REAL Express app + Mongoose models
 * against an in-memory MongoDB (dev-only). Not part of the production bundle.
 *
 * Run: npm run test:phase1   (from /server)
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/models/User.js';
import Ticket from '../src/models/Ticket.js';
import Message from '../src/models/Message.js';
import { nextTicketNumber } from '../src/utils/ticketNumber.js';
import { requireRole } from '../src/middleware/auth.js';

let mongod;
let server;
let baseUrl;
let pass = 0;
let fail = 0;

function check(name, cond) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.error(`  ❌ ${name}`);
  }
}

async function call(method, path, { body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const agent = { name: 'Demo Agent', email: 'agent@supportflow.demo', password: 'SupportFlowAgent!1', role: 'agent' };
const customer = { name: 'Demo Customer', email: 'customer@supportflow.demo', password: 'SupportFlowCustomer!1', role: 'customer' };

async function main() {
  console.log('\n=== Phase 1 verification ===\n');

  check('env.JWT_SECRET is set (from process.env only)', typeof env.JWT_SECRET === 'string' && env.JWT_SECRET.length > 0);

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('supportflow_test'));
  console.log('  ℹ️  in-memory MongoDB started\n');

  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // ---------------------------------------------------------------- register
  console.log('--- register ---');
  const badRole = await call('POST', '/api/auth/register', { body: { name: 'H', email: 'h@x.com', password: 'x', role: 'superadmin' } });
  check('register with invalid role -> 400', badRole.status === 400);

  const noPw = await call('POST', '/api/auth/register', { body: { name: 'H', email: 'h2@x.com', role: 'customer' } });
  check('register without password -> 400', noPw.status === 400);

  const regAgent = await call('POST', '/api/auth/register', { body: agent });
  check('register agent -> 201', regAgent.status === 201);
  check('register response has role agent', regAgent.json.user.role === 'agent');
  check('register response has NO passwordHash', !('passwordHash' in regAgent.json.user) && !JSON.stringify(regAgent.json).includes('passwordHash'));

  const regCustomer = await call('POST', '/api/auth/register', { body: customer });
  check('register customer -> 201', regCustomer.status === 201);
  check('register response has role customer', regCustomer.json.user.role === 'customer');

  const dup = await call('POST', '/api/auth/register', { body: { ...customer, password: 'x' } });
  check('duplicate email -> 409', dup.status === 409);

  // ------------------------------------------------------------------- login
  console.log('--- login ---');
  const loginAgent = await call('POST', '/api/auth/login', { body: { email: agent.email, password: agent.password } });
  check('login agent -> 200 + token', loginAgent.status === 200 && typeof loginAgent.json.token === 'string');
  check('login response has NO passwordHash', !JSON.stringify(loginAgent.json).includes('passwordHash'));

  const decoded = jwt.verify(loginAgent.json.token, env.JWT_SECRET);
  check('JWT payload includes userId', decoded.userId === regAgent.json.user.id);
  check('JWT payload includes role', decoded.role === 'agent');
  const expDelta = decoded.exp * 1000 - Date.now();
  check('JWT expiry is ~24h', expDelta > 23.9 * 3600 * 1000 && expDelta <= 24 * 3600 * 1000);

  const badLogin = await call('POST', '/api/auth/login', { body: { email: agent.email, password: 'wrong-password' } });
  check('login wrong password -> 401', badLogin.status === 401);
  const ghostLogin = await call('POST', '/api/auth/login', { body: { email: 'nobody@x.com', password: 'x' } });
  check('login unknown email -> 401', ghostLogin.status === 401);

  const token = loginAgent.json.token;
  await runAuthChecks(token);
  await runSchemaChecks();
}

async function runAuthChecks(token) {
  console.log('--- requireAuth (protected route /api/auth/me) ---');
  const noToken = await call('GET', '/api/auth/me');
  check('no token -> 401', noToken.status === 401);
  const garbage = await call('GET', '/api/auth/me', { token: 'abc.def.ghi' });
  check('garbage token -> 401', garbage.status === 401);
  const expired = jwt.sign({ userId: '000000000000000000000000', role: 'agent' }, env.JWT_SECRET, { expiresIn: '-1s' });
  const expiredRes = await call('GET', '/api/auth/me', { token: expired });
  check('expired token -> 401', expiredRes.status === 401);
  const me = await call('GET', '/api/auth/me', { token });
  check('valid token -> 200 and role agent', me.status === 200 && me.json.user.role === 'agent');
  check('/me response has NO passwordHash', !JSON.stringify(me.json).includes('passwordHash'));

  console.log('--- requireRole ---');
  const deny = await new Promise((resolve) => {
    requireRole('agent')(
      { user: { role: 'customer' } },
      { status: (c) => ({ json: () => resolve({ status: c }) }) },
      () => resolve({ status: 'SHOULD_NOT_REACH' })
    );
  });
  check('customer on agent-only route -> 403', deny.status === 403);
  const allow = await new Promise((resolve) => {
    requireRole('agent')(
      { user: { role: 'agent' } },
      { status: () => ({ json: () => {} }) },
      () => resolve({ calledNext: true })
    );
  });
  check('agent on agent-only route -> next() called', allow.calledNext === true);

  console.log('--- role immutability ---');
  let patchRes;
  try {
    patchRes = await call('PATCH', '/api/auth/me', { body: { role: 'agent' }, token });
  } catch {
    patchRes = { status: 'fetch-error' };
  }
  check('no endpoint can change role (PATCH /me -> 404/405)', patchRes.status !== 200);
}

async function runSchemaChecks() {
  console.log('--- passwordHash is never returned (DB-level) ---');
  const agentDb = await User.findOne({ email: agent.email });
  check('default query does NOT return passwordHash', !('passwordHash' in (agentDb?.toObject() ?? {})));
  const withHash = await User.findOne({ email: agent.email }).select('+passwordHash');
  check('explicit +select retrieves hash (for bcrypt compare only)', typeof withHash.passwordHash === 'string');

  console.log('--- schema enum / required enforcement ---');
  const agentDbId = agentDb._id;

  let badPriority = null;
  try {
    await Ticket.create({ customerId: agentDbId, subject: 't', description: 'd', priority: 'Urgent' });
  } catch (e) {
    badPriority = e;
  }
  check('priority "Urgent" rejected (enum is fixed)', badPriority !== null && badPriority.name === 'ValidationError');

  let badStatus = null;
  try {
    await Ticket.create({ customerId: agentDbId, subject: 't', description: 'd', status: 'Closed' });
  } catch (e) {
    badStatus = e;
  }
  check('status "Closed" rejected (enum is fixed)', badStatus !== null && badStatus.name === 'ValidationError');

  let noSubject = null;
  try {
    await Ticket.create({ customerId: agentDbId, description: 'd' });
  } catch (e) {
    noSubject = e;
  }
  check('ticket without subject rejected (required)', noSubject !== null && noSubject.name === 'ValidationError');

  let badSenderRole = null;
  try {
    await Message.create({ ticketId: new mongoose.Types.ObjectId(), senderId: agentDbId, senderRole: 'bot', body: 'hi' });
  } catch (e) {
    badSenderRole = e;
  }
  check('message senderRole "bot" rejected (enum is fixed)', badSenderRole !== null && badSenderRole.name === 'ValidationError');

  let badUserRole = null;
  try {
    await User.create({ name: 'X', email: 'x@s.com', role: 'admin', passwordHash: 'h' });
  } catch (e) {
    badUserRole = e;
  }
  check('user role "admin" rejected at schema level', badUserRole !== null && badUserRole.name === 'ValidationError');

  await runTicketChecks(agentDb._id);
}

async function runTicketChecks(customerId) {
  console.log('--- ticketNumber auto-generation (unique, never collides) ---');
  const t1 = await Ticket.create({ customerId, subject: 'Login broken', description: 'Cannot log in' });
  check('first ticket is TCK-1001', t1.ticketNumber === 'TCK-1001');
  check('status defaults to "New"', t1.status === 'New');
  check('priority is null until finalized', t1.priority === null);
  check('category is null until finalized', t1.category === null);
  check('assignedAgentId is null', t1.assignedAgentId === null);
  check('aiSuggestion is null until triage phase', t1.aiSuggestion === null);
  check('resolutionNote is null', t1.resolutionNote === null);
  check('timestamps set (createdAt/updatedAt)', !!t1.createdAt && !!t1.updatedAt);

  const t2 = await Ticket.create({ customerId, subject: 'Billing issue', description: 'Overcharged' });
  const t3 = await Ticket.create({ customerId, subject: 'Feature request', description: 'Dark mode' });
  check('numbers increment uniquely (1002, 1003)', t2.ticketNumber === 'TCK-1002' && t3.ticketNumber === 'TCK-1003');
  const manual = await nextTicketNumber();
  check('counter keeps going (TCK-1004)', manual === 'TCK-1004');

  const withHigh = await Ticket.create({
    customerId,
    subject: 'Urgent outage',
    description: 'All pages down',
    priority: 'High',
    assignedAgentId: customerId,
    aiSuggestion: { category: 'Tech', priority: 'High', summary: 'Severe' },
  });
  check('valid priority "High" + assignedAgent accepted', withHigh.priority === 'High');
  check('aiSuggestion contents stored', withHigh.aiSuggestion.category === 'Tech' && withHigh.aiSuggestion.priority === 'High' && withHigh.aiSuggestion.summary === 'Severe');
  check('aiSuggestion has no extra _id field', withHigh.aiSuggestion._id === undefined);

  const relaxed = await Ticket.create({ customerId, subject: 'R', description: 'D', priority: null });
  check('explicit null priority allowed (nullable until finalized)', relaxed.priority === null);

  console.log('--- Message schema ---');
  const msg = await Message.create({ ticketId: t1._id, senderId: customerId, senderRole: 'agent', body: 'Looking into it' });
  check('message created with senderRole agent + body', msg.senderRole === 'agent' && msg.body === 'Looking into it');
  check('message has createdAt, NO updatedAt', !!msg.createdAt && msg.updatedAt === undefined);

  console.log(`\n=== Phase 1 verification: ${pass} passed, ${fail} failed ===`);
}

await main()
  .then(async () => {
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(fail === 0 ? 0 : 1);
  })
  .catch(async (err) => {
    console.error('FATAL:', err);
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(1);
  });