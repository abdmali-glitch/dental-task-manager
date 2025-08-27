// backend/src/lib/notify.js
import { db, saveDB } from '../models/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a notification for a user.
 * @param {string} userId
 * @param {{type:string, title:string, body?:string, link?:string, data?:object}} payload
 */
export function notify(userId, { type, title, body = '', link = '', data = {} }) {
  const n = {
    id: uuidv4(),
    userId,
    type,           // e.g. 'MESSAGE' | 'TASK_ASSIGNED' | 'TASK_COMMENT' | 'TASK_COMPLETED' | 'ROTA'
    title,          // short title
    body,           // short message (optional)
    link,           // suggested client route (e.g. '/messages')
    data,           // extra info (e.g. {peerId, taskId, date})
    read: false,
    createdAt: new Date().toISOString()
  };
  if (!db.notifications) db.notifications = [];
  db.notifications.push(n);
  saveDB();
  return n;
}
