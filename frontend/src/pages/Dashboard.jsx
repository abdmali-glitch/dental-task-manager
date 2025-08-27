import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export default function Dashboard() {
  const { user, API_BASE } = useAuth();
  const [stats, setStats] = useState({ total:0, open:0, completed:0 });
  const [todayRota, setTodayRota] = useState([]);
  const [notifs, setNotifs] = useState([]);      // we will show UNREAD only
  const [error, setError] = useState('');
  const dateStr = useMemo(() => todayLocal(), []);
  const isManager = ['ADMIN','HR','DIRECTOR'].includes(user.role);

  async function loadAll() {
    try {
      const { data } = await axios.get(`${API_BASE}/tasks`);
      const total = data.length, open = data.filter(t=>t.status==='OPEN').length, completed = data.filter(t=>t.status==='COMPLETED').length;
      setStats({ total, open, completed });
    } catch (e) { setError(e.response?.data?.error || 'Failed to load tasks'); }

    try {
      const { data: rota } = await axios.get(`${API_BASE}/rota/day?date=${dateStr}`);
      setTodayRota(rota);
    } catch {}

    try {
      // 🔹 fetch ONLY unread so “clear” actually removes them from view
      const { data: latest } = await axios.get(`${API_BASE}/notifications?unread=1&limit=50`);
      setNotifs(latest);
    } catch {}
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [API_BASE, dateStr]);

  const myShift = useMemo(
    () => todayRota.find(r => r.user?.id === user.id) || todayRota[0] || null,
    [todayRota, user.id]
  );

  async function download(url, filename) {
    const res = await axios.get(url, { responseType: 'blob' });
    const blob = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = blob; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); window.URL.revokeObjectURL(blob);
  }

  // 🔹 Clear ALL (mark read) then hide them by reloading UNREAD list
  async function clearAllNotifs() {
    await axios.post(`${API_BASE}/notifications/read-all`);
    setNotifs([]); // hide immediately
  }

  // 🔹 Clear one (mark read) then remove from state
  async function clearOne(id) {
    await axios.post(`${API_BASE}/notifications/read`, { id });
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div>
      <Navbar />

      {/* EMPLOYEE: “Your role today” at top */}
      {user.role === 'EMPLOYEE' ? (
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Your role today</h2>
            <p className="text-gray-700">
              {myShift
                ? <>You are scheduled as <b>{myShift.roleLabel || (myShift.user?.role ?? '—')}</b> on <b>{dateStr}</b>.</>
                : <>No shift assigned for you today.</>}
            </p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Link to="/tasks" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Go to Tasks</Link>
              <Link to="/messages" className="px-4 py-2 bg-white rounded-xl border hover:bg-blue-50">Messenger</Link>
            </div>
          </div>
        </div>
      ) : (
        // Managers: KPI cards first
        <div className="p-6 grid md:grid-cols-4 gap-4">
          <Card title="All Tasks" value={stats.total} />
          <Card title="Open" value={stats.open} />
          <Card title="Completed" value={stats.completed} />
          {(user.role==='HR'||user.role==='DIRECTOR') && (
            <div className="bg-white shadow p-4 rounded-2xl text-center">
              <div className="font-semibold mb-2">Reports</div>
              <div className="flex gap-2 justify-center">
                <button onClick={()=>download(`${API_BASE}/reports/tasks.csv`,'tasks.csv')} className="px-3 py-2 bg-blue-600 text-white rounded-xl">CSV</button>
                <button onClick={()=>download(`${API_BASE}/reports/tasks.xlsx`,'tasks.xlsx')} className="px-3 py-2 bg-blue-600 text-white rounded-xl">Excel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Managers see the whole rota list; employees don’t */}
      {isManager && (
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Today’s Rota — {dateStr}</h2>
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {todayRota.map(r => (
                <div key={r.id} className="border rounded-xl p-3">
                  <div className="font-medium">{r.user?.name || '—'} <span className="text-xs text-gray-500">({r.user?.role || '—'})</span></div>
                  <div className="text-sm text-gray-600">{r.roleLabel || '—'}{r.location ? ` @ ${r.location}` : ''}</div>
                </div>
              ))}
              {!todayRota.length && <div className="text-gray-500">No rota entries for today yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Notifications at the bottom (UNREAD only) */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Notifications</h2>
            <div className="flex gap-3">
              <a href="#" onClick={e=>{e.preventDefault(); loadAll();}} className="text-sm text-blue-600">Refresh</a>
              <button onClick={clearAllNotifs} className="text-sm text-gray-600 hover:text-red-600">Clear all</button>
            </div>
          </div>
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className="border rounded-2xl p-3 flex items-start justify-between gap-3 bg-blue-50/40">
                <div>
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.body && <div className="text-xs text-gray-600">{n.body}</div>}
                  <div className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={()=>clearOne(n.id)} className="text-xs text-gray-600 hover:text-red-600">Clear</button>
              </div>
            ))}
            {!notifs.length && <div className="text-gray-500">No new notifications.</div>}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6">
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white shadow p-6 rounded-2xl">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}








