import express from 'express';
import { db } from '../models/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

export const reportsRouter = express.Router();

// CSV (HR & Director)
reportsRouter.get('/tasks.csv', requireAuth, requireRole('HR','DIRECTOR'), (req, res) => {
  const rows = [['id','title','frequency','status','dueDate','assignedTo','createdBy','createdAt','completedAt','completedBy']];
  db.tasks.forEach(t => rows.push([t.id,t.title,t.frequency,t.status,t.dueDate,t.assignedTo||'',t.createdBy||'',t.createdAt||'', t.completedAt||'', t.completedBy||'']));
  const csv = rows.map(r => r.map((v) => (v ?? '').toString().replaceAll('"','""')).map(v => `"${v}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
  res.send(csv);
});

// Excel (HR & Director)
reportsRouter.get('/tasks.xlsx', requireAuth, requireRole('HR','DIRECTOR'), async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tasks');
  ws.addRow(['id','title','frequency','status','dueDate','assignedTo','createdBy','createdAt','completedAt','completedBy']);
  db.tasks.forEach(t => ws.addRow([t.id,t.title,t.frequency,t.status,t.dueDate,t.assignedTo||'',t.createdBy||'',t.createdAt||'',t.completedAt||'',t.completedBy||'']));
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="tasks.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});
