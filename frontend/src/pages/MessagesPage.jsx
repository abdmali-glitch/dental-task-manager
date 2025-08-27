import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useSearchParams } from 'react-router-dom';

export default function MessagesPage() {
  const { user, API_BASE } = useAuth();
  const [users, setUsers] = useState([]);
  const [peerId, setPeerId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  const canViewAll = ['ADMIN', 'HR', 'DIRECTOR'].includes(user.role);

  async function loadUsers() {
    try {
      const url = `${API_BASE}/auth/${canViewAll ? 'users' : 'users-lite'}`;
      const res = await axios.get(url);
      const list = (res.data || []).filter(u => u.id !== user.id);
      setUsers(list);
      if (!peerId && list.length) setPeerId(list[0].id);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load users');
    }
  }

  async function loadConversation(id) {
    if (!id) return;
    try {
      const { data } = await axios.get(`${API_BASE}/messages?peerId=${id}`);
      setMessages(data);
      await axios.post(`${API_BASE}/messages/read`, { peerId: id });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load conversation');
    }
  }

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line
  useEffect(() => {
    const pid = searchParams.get('peerId');
    if (pid) setPeerId(pid);
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    if (!peerId) return;
    loadConversation(peerId);
    const t = setInterval(() => loadConversation(peerId), 5000);
    return () => clearInterval(t);
  }, [peerId]); // eslint-disable-line

  async function send() {
    if (!text || !peerId) return;
    try {
      await axios.post(`${API_BASE}/messages`, { toUserId: peerId, text });
      setText('');
      await loadConversation(peerId);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send message');
    }
  }

  return (
    <div>
      <Navbar />
      <div className="p-6 grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-2">Select recipient</h2>
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <select className="w-full border p-2 rounded-xl" value={peerId} onChange={e=>setPeerId(e.target.value)}>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow p-4 flex flex-col h-[70vh]">
          <div className="flex-1 overflow-auto space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`max-w-[70%] p-2 rounded-xl ${m.fromUserId===user.id?'ml-auto bg-blue-600 text-white':'bg-gray-100'}`}>
                <div className="text-xs opacity-70">{new Date(m.createdAt).toLocaleString()}</div>
                <div>{m.text}</div>
                {m.fromUserId!==user.id && (
                  <div className="mt-1">
                    <button onClick={()=>setText(`Re: ${m.text}\n`)} className="text-xs underline">Respond</button>
                  </div>
                )}
              </div>
            ))}
            {!messages.length && <div className="text-gray-500">No messages yet.</div>}
          </div>
          <div className="pt-2 flex gap-2">
            <input className="flex-1 border p-2 rounded-xl" placeholder="Type a message..." value={text} onChange={e=>setText(e.target.value)} />
            <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded-2xl">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
