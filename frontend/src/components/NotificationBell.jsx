import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h/24); return `${d}d ago`;
}

export default function NotificationBell() {
  const { API_BASE } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const nav = useNavigate();

  async function load() {
    const unreadItems = await axios.get(`${API_BASE}/notifications?unread=1&limit=200`);
    setUnread(unreadItems.data.length);
    const latest = await axios.get(`${API_BASE}/notifications?limit=20`);
    setList(latest.data);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    function onDocClick(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function markAll() {
    await axios.post(`${API_BASE}/notifications/read-all`);
    await load();
  }
  async function openItem(n) {
    if (n.link) nav(n.link + (n.data?.peerId ? `?peerId=${n.data.peerId}` : ''));
    await axios.post(`${API_BASE}/notifications/read`, { id: n.id });
    await load();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className="relative rounded-full p-2 bg-white hover:bg-blue-50" title="Notifications">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z" stroke="currentColor" strokeWidth="1.5"/></svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-2xl border z-50">
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="font-semibold">Notifications</div>
            <button onClick={markAll} className="text-xs text-blue-600 underline">Mark all read</button>
          </div>
          <div className="max-h-96 overflow-auto">
            {list.map(n => (
              <button key={n.id} onClick={()=>openItem(n)} className={"w-full text-left px-3 py-2 border-t hover:bg-blue-50 " + (n.read ? "" : "bg-blue-50/40")}>
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-gray-600 truncate">{n.body}</div>}
                <div className="text-[10px] text-gray-500">{timeAgo(n.createdAt)}</div>
              </button>
            ))}
            {!list.length && <div className="px-3 py-6 text-gray-500 text-sm">No notifications yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
