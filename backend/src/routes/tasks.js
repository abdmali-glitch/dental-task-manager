import express from 'express';
import { db, Frequencies, saveDB } from '../models/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { notify } from '../lib/notify.js';

export const tasksRouter = express.Router();

// Create task (Admin/HR/Director)
tasksRouter.post('/', requireAuth, requireRole('ADMIN','HR','DIRECTOR'), (req, res) => {
  const { title, description, frequency, dueDate, assignedTo } = req.body;
  if (!title || !frequency || !dueDate || !assignedTo) return res.status(400).json({ error: 'Missing fields' });
  if (!Frequencies.includes(frequency)) return res.status(400).json({ error: 'Invalid frequency' });
  const assignee = db.users.find(u => u.id === assignedTo);
  if (!assignee) return res.status(404).json({ error: 'Assignee not found' });

  const task = {
    id: uuidv4(),
    title, description: description || '',
    frequency, dueDate,
    assignedTo, createdBy: req.user.id,
    status: 'OPEN', createdAt: new Date().toISOString(),
    completedAt: null, completedBy: null
  };
  db.tasks.push(task); saveDB();

  notify(assignedTo, {
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    body: `${title}`,
    link: '/tasks',
    data: { taskId: task.id }
  });

  res.status(201).json(task);
});

// List (basic)
tasksRouter.get('/', requireAuth, (req, res) => {
  const { frequency, status, assignedTo } = req.query;
  let tasks = db.tasks;
  if (frequency) tasks = tasks.filter(t => t.frequency === frequency);
  if (status) tasks = tasks.filter(t => t.status === status);
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === assignedTo);
  if (req.user.role === 'EMPLOYEE') tasks = tasks.filter(t => t.assignedTo === req.user.id);
  res.json(tasks);
});

// List (enriched for dashboards)
tasksRouter.get('/enriched', requireAuth, (req, res) => {
  const { frequency, status, assignedTo } = req.query;
  let tasks = db.tasks;
  if (frequency) tasks = tasks.filter(t => t.frequency === frequency);
  if (status) tasks = tasks.filter(t => t.status === status);
  if (assignedTo) tasks = tasks.filter(t => t.assignedTo === assignedTo);
  if (req.user.role === 'EMPLOYEE') tasks = tasks.filter(t => t.assignedTo === req.user.id);

  const byId = id => db.users.find(u => u.id === id) || null;
  const enriched = tasks.map(t => {
    const comments = db.comments
      .filter(c => c.taskId === t.id)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const latest = comments[0] || null;
    return {
      ...t,
      assignedToUser: byId(t.assignedTo) ? { id: byId(t.assignedTo).id, name: byId(t.assignedTo).name, role: byId(t.assignedTo).role } : null,
      createdByUser: byId(t.createdBy) ? { id: byId(t.createdBy).id, name: byId(t.createdBy).name, role: byId(t.createdBy).role } : null,
      completedByUser: byId(t.completedBy) ? { id: byId(t.completedBy).id, name: byId(t.completedBy).name, role: byId(t.completedBy).role } : null,
      latestComment: latest ? { id: latest.id, text: latest.text, createdAt: latest.createdAt, author: byId(latest.authorId) ? { id: latest.authorId, name: byId(latest.authorId).name } : null } : null,
      commentsCount: comments.length
    };
  });
  res.json(enriched);
});

// Complete a task (records who completed + notify creator)
tasksRouter.patch('/:id/complete', requireAuth, (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.assignedTo !== req.user.id && !['ADMIN','HR','DIRECTOR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  task.status = 'COMPLETED';
  task.completedAt = new Date().toISOString();
  task.completedBy = req.user.id;
  saveDB();

  if (task.createdBy && task.createdBy !== req.user.id) {
    notify(task.createdBy, {
      type: 'TASK_COMPLETED',
      title: 'Task completed',
      body: `${task.title}`,
      link: '/tasks',
      data: { taskId: task.id }
    });
  }

  res.json(task);
});

// Comments (notify assignee & creator)
tasksRouter.post('/:id/comments', requireAuth, (req, res) => {
  const { text } = req.body;
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const c = { id: uuidv4(), taskId: task.id, authorId: req.user.id, text, createdAt: new Date().toISOString() };
  db.comments.push(c); saveDB();

  const recipients = new Set([task.assignedTo, task.createdBy]);
  recipients.delete(req.user.id);
  for (const uid of recipients) {
    if (!uid) continue;
    notify(uid, {
      type: 'TASK_COMMENT',
      title: 'New task comment',
      body: text.slice(0,120),
      link: '/tasks',
      data: { taskId: task.id }
    });
  }

  res.status(201).json(c);
});


