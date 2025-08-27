import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = ['EMPLOYEE', 'ADMIN', 'HR', 'DIRECTOR'];

export default function UsersPage() {
  const { user, API_BASE } = useAuth();
  const canView = ['ADMIN', 'HR', 'DIRECTOR'].includes(user.role);
  const isAdmin = user.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    if (!canView) return;
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/auth/users`);
      setUsers(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load users');
    }
  }

  useEffect(() => { loadUsers(); /* eslint-disable-next-line */ }, []);

  async function createUser(e) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true); setError(null); setSuccess('');
    try {
      await axios.post(`${API_BASE}/auth/users`, { name, email, password, role });
      setSuccess(`User "${name}" created`);
      setName(''); setEmail(''); setPassword(''); setRole('EMPLOYEE');
      await loadUsers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!isAdmin) return;
    if (id === user.id) return alert("You can't delete yourself.");
    if (!confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API_BASE}/auth/users/${id}`);
      await loadUsers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete user');
    }
  }

  if (!canView) {
    return (
      <div>
        <Navbar />
        <div className="p-6">
          <div className="bg-white shadow rounded-2xl p-6 text-red-600">
            You don’t have permission to view this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="p-6 grid gap-6">
        <div className="bg-white shadow rounded-2xl p-6">
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-gray-600">View all users. {isAdmin ? 'Admins can also create / delete users.' : 'Only Admins can create or delete users.'}</p>
        </div>

        {isAdmin && (
          <form onSubmit={createUser} className="bg-white shadow rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold">Create user</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border p-2 rounded-xl" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
              <input className="border p-2 rounded-xl" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
              <input className="border p-2 rounded-xl" placeholder="Password" type="text" value={password} onChange={e=>setPassword(e.target.value)} required />
              <select className="border p-2 rounded-xl" value={role} onChange={e=>setRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-2xl">
                {loading ? 'Creating…' : 'Create'}
              </button>
              {error && <span className="text-red-600 text-sm">{error}</span>}
              {success && <span className="text-green-700 text-sm">{success}</span>}
            </div>
          </form>
        )}

        <div className="bg-white shadow rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Last Login</th>
                <th className="text-left p-3">Last Logout</th>
                {isAdmin && <th className="text-left p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 text-sm text-gray-600">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
                  <td className="p-3 text-sm text-gray-600">{u.lastLogout ? new Date(u.lastLogout).toLocaleString() : '—'}</td>
                  {isAdmin && (
                    <td className="p-3">
                      {u.id !== user.id && (
                        <button onClick={()=>deleteUser(u.id)} className="px-3 py-1 bg-red-600 text-white rounded-xl">Delete</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!users.length && (
                <tr><td className="p-6 text-center text-gray-500" colSpan={isAdmin?6:5}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

