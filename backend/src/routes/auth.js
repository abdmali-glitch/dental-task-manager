import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, saveDB } from '../models/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
export const authRouter = express.Router();

import { seed } from '../models/db.js'; seed();

/** Login */
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });

  const now = new Date().toISOString();
  user.lastLogin = now;
  db.auditLogs.push({ id: uuidv4(), userId: user.id, type: 'LOGIN', time: now, userAgent: req.headers['user-agent'] || '' });
  saveDB();

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, lastLogin: user.lastLogin, lastLogout: user.lastLogout } });
});

/** Logout */
authRouter.post('/logout', requireAuth, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  const now = new Date().toISOString();
  if (user) user.lastLogout = now;
  db.auditLogs.push({ id: uuidv4(), userId: req.user.id, type: 'LOGOUT', time: now, userAgent: req.headers['user-agent'] || '' });
  saveDB();
  res.json({ ok: true });
});

/** Create user (Admin) */
authRouter.post('/users', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  if (db.users.some(u => u.email === email)) return res.status(409).json({ error: 'Email already in use' });
  const user = { id: uuidv4(), name, email, role, passwordHash: bcrypt.hashSync(password, 10), lastLogin: null, lastLogout: null };
  db.users.push(user); saveDB();
  res.status(201).json({ id: user.id, name, email, role, lastLogin: null, lastLogout: null });
});

/** List users (Admin/HR/Director) */
authRouter.get('/users', requireAuth, requireRole('ADMIN','HR','DIRECTOR'), (req, res) => {
  res.json(db.users.map(({ passwordHash, ...u }) => u));
});

/** Lite list (all roles) */
authRouter.get('/users-lite', requireAuth, (req, res) => {
  const list = db.users.filter(u => u.id !== req.user.id).map(u => ({ id: u.id, name: u.name, role: u.role }));
  res.json(list);
});

/** Delete user (Admin) */
authRouter.delete('/users/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const id = req.params.id;
  if (id === req.user.id) return res.status(400).json({ error: 'Admins cannot delete themselves' });
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.tasks.forEach(t => {
    if (t.assignedTo === id) t.assignedTo = null;
    if (t.createdBy === id) t.createdBy = null;
    if (t.completedBy === id) t.completedBy = null;
  });

  db.users.splice(idx, 1); saveDB();
  res.json({ ok: true });
});

/** Audit log */
authRouter.get('/audit', requireAuth, requireRole('ADMIN','HR','DIRECTOR'), (req, res) => {
  const logs = db.auditLogs.slice(-2000).map(l => ({
    id: l.id, type: l.type, time: l.time, userId: l.userId,
    userName: db.users.find(u => u.id === l.userId)?.name || 'Deleted/Unknown',
    userAgent: l.userAgent || ''
  }));
  res.json(logs);
});



