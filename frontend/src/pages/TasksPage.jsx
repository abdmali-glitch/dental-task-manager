import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const DISPLAY_TABS = ['DAILY','WEEKLY','MONTHLY','QUARTERLY','SIX_MONTHS','ANNUALLY']; // left group
const labelFor = (f) => (f === 'TASK_SHEET' ? 'Task Sheet' : f.replace('_', ' '));

export default function TasksPage() {
  const { user, API_BASE } = useAuth();

  // 👉 Start on Task Sheet
  const [filterFrequency, setFilterFrequency] = useState('TASK_SHEET');

  // Create form
  const [newFrequency, setNewFrequency] = useState('TASK_SHEET');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [commentMap, setCommentMap] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [error, setError] = useState('');

  const canCreate = ['ADMIN', 'HR', 'DIRECTOR'].includes(user.role);
  const scrollRef = useRef(null);

  useEffect(() => {
    // on first render, push scroll to the right (so Task Sheet sits on the right edge)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  async function load() {
    setError('');
    try {
      const q = new URLSearchParams();
      if (filterFrequency) q.set('frequency', filterFrequency);
      const { data } = await axios.get(`${API_BASE}/tasks/enriched?` + q.toString());
      setTasks(data);

      if (canCreate && !users.length) {
        const res = await axios.get(`${API_BASE}/auth/users`);
        setUsers(res.data || []);
        if (!assignedTo && res.data?.length) setAssignedTo(res.data[0].id);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load tasks');
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterFrequency]);

  async function createTask(e) {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/tasks`, { title, description, frequency: newFrequency, dueDate, assignedTo });
      setTitle(''); setDescription(''); setDueDate('');
      await load();
    } catch (e) { setError(e.response?.data?.error || 'Failed to create task'); }
  }

  async function completeTask(id) {
    try { await axios.patch(`${API_BASE}/tasks/${id}/complete`); await load(); }
    catch (e) { setError(e.response?.data?.error || 'Failed to complete task'); }
  }

  async function addComment(id) {
    const text = commentMap[id]; if (!text) return;
    try {
      await axios.post(`${API_BASE}/tasks/${id}/comments`, { text });
      setCommentMap(prev => ({ ...prev, [id]: '' }));
      await load();
      if (openComments[id]) await viewComments(id);
    } catch (e) { setError(e.response?.data?.error || 'Failed to add comment'); }
  }

  async function viewComments(id) {
    try {
      const { data } = await axios.get(`${API_BASE}/tasks/${id}/comments`);
      setOpenComments(prev => ({ ...prev, [id]: data }));
    } catch (e) { setError(e.response?.data?.error || 'Failed to load comments'); }
  }

  // Helpers for pill styling
  function pillClasses(active, isTaskSheet) {
    if (!active) return 'px-4 py-2 rounded-2xl whitespace-nowrap bg-white hover:bg-blue-50 transition-colors';
    // active:
    if (isTaskSheet) return 'px-4 py-2 rounded-2xl whitespace-nowrap bg-purple-600 text-white shadow';
    return 'px-4 py-2 rounded-2xl whitespace-nowrap bg-blue-600 text-white shadow';
  }

  return (
    <div>
      <Navbar />

      {/* Filter Row: left group + right-edge Task Sheet */}
      <div className="p-6">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div className="flex items-center justify-between min-w-[720px] gap-4">
            {/* Left group */}
            <div className="flex gap-3">
              <button
                onClick={() => setFilterFrequency('')}
                className={pillClasses(filterFrequency === '', false)}
              >
                All
              </button>
              {DISPLAY_TABS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilterFrequency(f)}
                  className={pillClasses(filterFrequency === f, false)}
                >
                  {labelFor(f)}
                </button>
              ))}
            </div>

            {/* Right edge: Task Sheet with PURPLE active */}
            <div className="flex">
              <button
                onClick={() => setFilterFrequency('TASK_SHEET')}
                className={pillClasses(filterFrequency === 'TASK_SHEET', true)}
                title="Ad-hoc / one-off tasks"
              >
                {labelFor('TASK_SHEET')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create & Assign (Admin/HR/Director) */}
      {canCreate && (
        <div className="p-6">
          <div className="bg-white shadow rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Create & Assign Task</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="border p-2 rounded-xl" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
              <select className="border p-2 rounded-xl" value={newFrequency} onChange={e => setNewFrequency(e.target.value)}>
                <option value="TASK_SHEET">Task Sheet</option>
                {DISPLAY_TABS.map(f => <option key={f} value={f}>{labelFor(f)}</option>)}
              </select>
              <input className="border p-2 rounded-xl" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <textarea className="border p-2 rounded-xl md:col-span-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
              <select className="border p-2 rounded-xl" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <button onClick={createTask} className="px-4 py-2 bg-blue-600 text-white rounded-2xl">Create Task</button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-6">
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="p-6">
        <div className="bg-white shadow rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Freq</th>
                <th className="text-left p-3">Due</th>
                <th className="text-left p-3">Assigned To</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Completed By</th>
                <th className="text-left p-3">Latest Comment</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <React.Fragment key={t.id}>
                  <tr className="border-t align-top">
                    <td className="p-3">{t.title}</td>
                    <td className="p-3">{labelFor(t.frequency)}</td>
                    <td className="p-3">{t.dueDate}</td>
                    <td className="p-3">{t.assignedToUser?.name || '—'}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.completedByUser?.name || (t.status === 'COMPLETED' ? '(unknown)' : '—')}</td>
                    <td className="p-3">
                      {t.latestComment
                        ? <div className="text-sm"><b>{t.latestComment.author?.name || '—'}:</b> {t.latestComment.text}</div>
                        : <span className="text-gray-400 text-sm">No comments</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        {t.status !== 'COMPLETED' && (
                          <button onClick={() => completeTask(t.id)} className="px-3 py-1 bg-green-600 text-white rounded-xl">Complete</button>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            className="border p-1 rounded-xl"
                            placeholder="Comment..."
                            value={commentMap[t.id] || ''}
                            onChange={e => setCommentMap(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                          <button onClick={() => addComment(t.id)} className="px-3 py-1 bg-blue-600 text-white rounded-xl">Save</button>
                        </div>
                        <button onClick={() => viewComments(t.id)} className="px-3 py-1 bg-gray-100 rounded-xl">View</button>
                      </div>
                    </td>
                  </tr>
                  {openComments[t.id] && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="p-3">
                        <div className="space-y-1">
                          {openComments[t.id].map(c => (
                            <div key={c.id} className="text-sm">
                              <b>{c.author?.name || '—'}</b>{' '}
                              <span className="text-gray-500">({new Date(c.createdAt).toLocaleString()})</span>: {c.text}
                            </div>
                          ))}
                          {!openComments[t.id].length && <div className="text-sm text-gray-500">No comments yet.</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!tasks.length && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan="8">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

