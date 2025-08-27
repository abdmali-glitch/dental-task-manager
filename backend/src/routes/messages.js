import express from 'express';
import { db, saveDB } from '../models/db.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { notify } from '../lib/notify.js';

export const messagesRouter = express.Router();

messagesRouter.post('/', requireAuth, (req, res) => {
  const { toUserId, text } = req.body;
  const to = db.users.find(u => u.id === toUserId);
  if (!to) return res.status(404).json({ error: 'Recipient not found' });

  const msg = { id: uuidv4(), fromUserId: req.user.id, toUserId, text, createdAt: new Date().toISOString(), read: false };
  db.messages.push(msg);
  saveDB();

  const from = db.users.find(u => u.id === req.user.id);
  notify(toUserId, {
    type: 'MESSAGE',
    title: `New message from ${from?.name || 'Someone'}`,
    body: (text || '').slice(0, 120),
    link: '/messages',
    data: { peerId: req.user.id }
  });

  res.status(201).json(msg);
});

messagesRouter.get('/', requireAuth, (req, res) => {
  const { peerId } = req.query;
  if (!peerId) return res.status(400).json({ error: 'peerId required' });
  const conv = db.messages
    .filter(m => (m.fromUserId === req.user.id && m.toUserId === peerId) || (m.fromUserId === peerId && m.toUserId === req.user.id))
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(conv);
});

messagesRouter.post('/read', requireAuth, (req, res) => {
  const { peerId } = req.body;
  db.messages.forEach(m => { if (m.toUserId === req.user.id && m.fromUserId === peerId) m.read = true; });
  saveDB();
  res.json({ ok: true });
});

