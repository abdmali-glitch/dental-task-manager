// backend/src/routes/notifications.js
import express from 'express';
import { db, saveDB } from '../models/db.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = express.Router();

/**
 * GET /notifications?unread=1&limit=50
 * Returns notifications for the signed-in user.
 * If unread=1, only unread ones are returned.
 */
notificationsRouter.get('/', requireAuth, (req, res) => {
  const unreadOnly = ['1','true','yes'].includes(String(req.query.unread || '').toLowerCase());
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

  const list = (db.notifications || [])
    .filter(n => n.userId === req.user.id)
    .filter(n => (unreadOnly ? !n.read : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  res.json(list);
});

/** POST /notifications/read { id }  -> mark one as read */
notificationsRouter.post('/read', requireAuth, (req, res) => {
  const { id } = req.body || {};
  const n = (db.notifications || []).find(x => x.id === id && x.userId === req.user.id);
  if (!n) return res.status(404).json({ error: 'Not found' });
  n.read = true;
  saveDB();
  res.json({ ok: true });
});

/** POST /notifications/read-all -> mark ALL of this user's notifications as read */
notificationsRouter.post('/read-all', requireAuth, (req, res) => {
  (db.notifications || []).forEach(n => {
    if (n.userId === req.user.id && !n.read) n.read = true;
  });
  saveDB();
  res.json({ ok: true });
});

/** DELETE /notifications/clear -> permanently remove this user's notifications */
notificationsRouter.delete('/clear', requireAuth, (req, res) => {
  const before = db.notifications.length;
  db.notifications = (db.notifications || []).filter(n => n.userId !== req.user.id);
  const removed = before - db.notifications.length;
  saveDB();
  res.json({ ok: true, removed });
});


