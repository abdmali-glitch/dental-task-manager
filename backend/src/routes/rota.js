import express from 'express';
import { db, saveDB, RotaRoles, RotaLocations } from '../models/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { notify } from '../lib/notify.js';

export const rotaRouter = express.Router();

const mapWithUser = r => {
  const u = db.users.find(x => x.id === r.userId);
  return { ...r, user: u ? { id: u.id, name: u.name, role: u.role } : null };
};

/** Meta (roles & locations for dropdowns) */
rotaRouter.get('/meta', requireAuth, (_req, res) => {
  res.json({ roles: RotaRoles, locations: RotaLocations });
});

/** Month view: /rota?month=YYYY-MM */
rotaRouter.get('/', requireAuth, (req, res) => {
  const month = req.query.month; // YYYY-MM
  let items = db.rota;
  if (month && /^\d{4}-\d{2}$/.test(month)) items = items.filter(r => r.date.startsWith(month));

  // Employees only see their own rota everywhere
  if (req.user.role === 'EMPLOYEE') items = items.filter(r => r.userId === req.user.id);

  res.json(items.map(mapWithUser));
});

/** Day view: /rota/day?date=YYYY-MM-DD */
rotaRouter.get('/day', requireAuth, (req, res) => {
  const date = req.query.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Provide date=YYYY-MM-DD' });

  let items = db.rota.filter(r => r.date === date);
  if (req.user.role === 'EMPLOYEE') items = items.filter(r => r.userId === req.user.id);

  res.json(items.map(mapWithUser));
});

/** Today redirect to /day */
rotaRouter.get('/today', requireAuth, (_req, res) => {
  const d = new Date(), y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  res.redirect(`/rota/day?date=${y}-${m}-${day}`);
});

/** Create rota entry (Admin/HR/Director) */
rotaRouter.post('/', requireAuth, requireRole('ADMIN','HR','DIRECTOR'), (req, res) => {
  const { date, userId, roleLabel, location } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid or missing date' });
  const u = db.users.find(x => x.id === userId);
  if (!u) return res.status(404).json({ error: 'User not found' });

  // validate against curated lists (optional but safer)
  if (roleLabel && !RotaRoles.includes(roleLabel)) return res.status(400).json({ error: 'Invalid role' });
  if (location && !RotaLocations.includes(location)) return res.status(400).json({ error: 'Invalid location' });

  const entry = {
    id: uuidv4(),
    date,
    userId,
    roleLabel: roleLabel || '',
    location: location || '',
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  db.rota.push(entry);
  saveDB();

  notify(userId, {
    type: 'ROTA',
    title: 'You are scheduled',
    body: `${date}${entry.roleLabel ? ` — ${entry.roleLabel}` : ''}${entry.location ? ` @ ${entry.location}` : ''}`,
    link: '/rota',
    data: { date }
  });

  res.status(201).json(entry);
});

/** Delete rota entry (Admin/HR/Director) */
rotaRouter.delete('/:id', requireAuth, requireRole('ADMIN','HR','DIRECTOR'), (req, res) => {
  const idx = db.rota.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.rota.splice(idx, 1);
  saveDB();
  res.json({ ok: true });
});





