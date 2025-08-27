import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';
import { messagesRouter } from './routes/messages.js';
import { rotaRouter } from './routes/rota.js';
import { notificationsRouter } from './routes/notifications.js';
import { reportsRouter } from './routes/reports.js';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173','http://localhost:5174'], credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true, service: 'dental-task-manager', time: new Date().toISOString() }));

app.use('/auth', authRouter);
app.use('/tasks', tasksRouter);
app.use('/messages', messagesRouter);
app.use('/rota', rotaRouter);
app.use('/notifications', notificationsRouter);
app.use('/reports', reportsRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
