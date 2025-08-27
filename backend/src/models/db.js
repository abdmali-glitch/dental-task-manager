import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/** APP ROLES (account types): EMPLOYEE | ADMIN | HR | DIRECTOR */

const DATA_PATH = process.env.DATA_PATH || '/data/db.json';

export const db = {
  users: [],
  tasks: [],        // { id, title, description, frequency, dueDate, assignedTo, createdBy, status, createdAt, completedAt, completedBy }
  comments: [],     // { id, taskId, authorId, text, createdAt }
  messages: [],     // { id, fromUserId, toUserId, text, createdAt, read }
  auditLogs: [],    // { id, userId, type, time, userAgent }
  // rota item now supports optional `location`
  // { id, date:'YYYY-MM-DD', userId, roleLabel, location, createdBy, createdAt }
  rota: [],
  notifications: [] // { id, userId, type, title, body, link, data, read, createdAt }
};

export function loadDB() {
  try {
    const txt = fs.readFileSync(DATA_PATH, 'utf8');
    const parsed = JSON.parse(txt);
    for (const k of Object.keys(db)) db[k] = parsed[k] ?? db[k];
    console.log('[DB] Loaded', DATA_PATH);
  } catch {
    console.log('[DB] No DB file; will create on first save:', DATA_PATH);
  }
}

export function saveDB() {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[DB] save error:', e);
  }
}

export function seed() {
  loadDB();
  if (db.users.length) return;

  const adminId = uuidv4();
  const hrId = uuidv4();
  const dirId = uuidv4();
  const empId = uuidv4();

  db.users.push(
    { id: adminId, name: 'Alice Admin', email: 'admin@example.com', role: 'ADMIN', passwordHash: bcrypt.hashSync('admin123', 10), lastLogin: null, lastLogout: null },
    { id: hrId, name: 'Henry HR', email: 'hr@example.com', role: 'HR', passwordHash: bcrypt.hashSync('hr123', 10), lastLogin: null, lastLogout: null },
    { id: dirId, name: 'Diana Director', email: 'director@example.com', role: 'DIRECTOR', passwordHash: bcrypt.hashSync('director123', 10), lastLogin: null, lastLogout: null },
    { id: empId, name: 'Evan Employee', email: 'employee@example.com', role: 'EMPLOYEE', passwordHash: bcrypt.hashSync('employee123', 10), lastLogin: null, lastLogout: null },
  );

  saveDB();
}

export const Frequencies = ['TASK_SHEET','DAILY','WEEKLY','MONTHLY','QUARTERLY','SIX_MONTHS','ANNUALLY'];
export const Statuses = ['OPEN','COMPLETED'];

/** Curated lists for rota pickers */
export const RotaRoles = [
  'Dentist', 'Nurse', 'Receptionist', 'Hygienist', 'Therapist', 'Manager', 'Admin'
];

export const RotaLocations = [
  'Surgery 1', 'Surgery 2', 'Surgery 3', 'Reception 1', 'Reception 2', 'Sterilization', 'Office'
];




