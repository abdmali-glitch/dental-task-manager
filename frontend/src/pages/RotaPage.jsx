// frontend/src/pages/RotaPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function ym(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
const monthName = (d) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function RotaPage() {
  const { user, API_BASE } = useAuth();
  const isManager = ['ADMIN', 'HR', 'DIRECTOR'].includes(user.role);

  const [cursor, setCursor] = useState(() => new Date()); // month shown
  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()));

  const [monthItems, setMonthItems] = useState([]); // month entries (server already filters for employees)
  const [dayItems, setDayItems] = useState([]); // selected day entries
  const [users, setUsers] = useState([]); // employee list (for managers)
  const [meta, setMeta] = useState({ roles: [], locations: [] });

  // form order: EMPLOYEE -> ROLE -> LOCATION
  const [form, setForm] = useState({
    userId: '',
    roleLabel: '',
    location: '',
  });

  async function loadMeta() {
    const { data } = await axios.get(`${API_BASE}/rota/meta`);
    setMeta(data || { roles: [], locations: [] });
  }

  async function loadUsers() {
    if (!isManager) return;
    const { data } = await axios.get(`${API_BASE}/auth/users`);
    setUsers(data || []);
  }

  async function loadMonth() {
    const { data } = await axios.get(`${API_BASE}/rota?month=${ym(cursor)}`);
    setMonthItems(data || []);
  }

  async function loadDay() {
    const { data } = await axios.get(
      `${API_BASE}/rota/day?date=${selectedDate}`
    );
    setDayItems(data || []);
  }

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line
  }, [cursor]);
  useEffect(() => {
    loadDay();
    // eslint-disable-next-line
  }, [selectedDate]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null); // leading blanks
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const countByDate = useMemo(() => {
    const map = {};
    for (const r of monthItems) map[r.date] = (map[r.date] || 0) + 1;
    return map;
  }, [monthItems]);

  async function addToRota() {
    if (!form.userId || !form.roleLabel) return;
    await axios.post(`${API_BASE}/rota`, {
      date: selectedDate,
      userId: form.userId,
      roleLabel: form.roleLabel,
      location: form.location,
    });
    await Promise.all([loadMonth(), loadDay()]);
  }

  async function remove(id) {
    await axios.delete(`${API_BASE}/rota/${id}`);
    await Promise.all([loadMonth(), loadDay()]);
  }

  // helpers
  const disableRoleLoc = !form.userId;

  return (
    <div>
      <Navbar />

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                )
              }
              className="px-2 py-1 rounded-xl border"
            >
              &lsaquo;
            </button>
            <div className="font-semibold">{monthName(cursor)}</div>
            <button
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                )
              }
              className="px-2 py-1 rounded-xl border"
            >
              &rsaquo;
            </button>
          </div>
          <div className="mb-2">
            <input
              type="month"
              className="border rounded-xl p-2"
              value={ym(cursor)}
              onChange={(e) => {
                const [Y, M] = e.target.value.split('-').map(Number);
                setCursor(new Date(Y, M - 1, 1));
              }}
            />
          </div>
          <div className="grid grid-cols-7 text-center text-sm text-gray-500 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d, idx) =>
              d ? (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(ymd(d))}
                  className={
                    'relative h-16 rounded-2xl border flex flex-col items-center justify-center ' +
                    (ymd(d) === selectedDate
                      ? 'bg-blue-600 text-white'
                      : 'bg-white hover:bg-blue-50')
                  }
                >
                  <div className="text-base">{d.getDate()}</div>
                  {countByDate[ymd(d)] && (
                    <span
                      className={
                        'absolute bottom-1 text-[10px] px-2 py-0.5 rounded-full ' +
                        (ymd(d) === selectedDate
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-600 text-white')
                      }
                    >
                      {countByDate[ymd(d)]} assigned
                    </span>
                  )}
                </button>
              ) : (
                <div key={idx} />
              )
            )}
          </div>
        </div>

        {/* Assign form (managers only) */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="font-semibold mb-2">Assign shift (rota)</div>
          <div className="text-sm text-gray-600 mb-3">
            Selected date: <b>{selectedDate}</b>
          </div>

          {isManager ? (
            <div className="space-y-3">
              {/* 1) EMPLOYEE */}
              <select
                className="border rounded-xl p-2 w-full"
                value={form.userId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    userId: e.target.value,
                    // once employee chosen, prefill role/location with first options if empty
                    roleLabel: f.roleLabel || meta.roles[0] || '',
                    location: f.location || meta.locations[0] || '',
                  }))
                }
              >
                <option value="">Select employee…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>

              {/* 2) ROLE */}
              <select
                className="border rounded-xl p-2 w-full"
                value={form.roleLabel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roleLabel: e.target.value }))
                }
                disabled={disableRoleLoc}
                title={disableRoleLoc ? 'Select employee first' : undefined}
              >
                {meta.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* 3) LOCATION */}
              <select
                className="border rounded-xl p-2 w-full"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                disabled={disableRoleLoc}
                title={disableRoleLoc ? 'Select employee first' : undefined}
              >
                {meta.locations.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <button
                onClick={addToRota}
                disabled={!form.userId || !form.roleLabel}
                className={
                  'px-4 py-2 rounded-2xl text-white ' +
                  (!form.userId || !form.roleLabel
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:brightness-110')
                }
              >
                Add to rota
              </button>
              <div className="text-xs text-gray-500">
                Employees can only view their own rota. Admin/HR/Director can
                create and delete.
              </div>
            </div>
          ) : (
            <div className="text-gray-600">
              You can view your rota in the calendar and the list. (Only
              managers can create or delete entries.)
            </div>
          )}
        </div>

        {/* Assignments list for the selected day */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="font-semibold mb-2">
            Assignments on {selectedDate}
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {dayItems.map((r) => (
              <div
                key={r.id}
                className="border rounded-2xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {r.user?.name || '—'}{' '}
                    <span className="text-xs text-gray-500">
                      ({r.user?.role || '—'})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.roleLabel || '—'}
                    {r.location ? ` @ ${r.location}` : ''}
                  </div>
                </div>
                {isManager && (
                  <button
                    onClick={() => remove(r.id)}
                    className="px-3 py-1 rounded-xl bg-red-600 text-white"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
            {!dayItems.length && (
              <div className="text-gray-500">No assignments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

