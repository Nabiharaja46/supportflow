import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Build the safe, public representation of a user — passwordHash can
// never appear here, no matter what.
function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// POST /api/auth/register  { name, email, password, role }
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body ?? {};

    // role must be explicitly "customer" or "agent" — reject anything else.
    if (role !== 'customer' && role !== 'agent') {
      return res.status(400).json({
        message: 'role must be explicitly "customer" or "agent"',
      });
    }
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'name, email and password are required',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    // Never store plaintext passwords.
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, role, passwordHash });

    // NOTE: there is NO endpoint that lets a client change role after this point.
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { email, password } -> { token, user }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    // Password hash is select:false — pull it explicitly for the comparison.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // JWT payload MUST include userId and role. 24h expiry.
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      env.JWT_SECRET, // read from process.env via config/env.js — never hardcoded
      { expiresIn: '24h' }
    );

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — protected route used to demo the token + later phases.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;