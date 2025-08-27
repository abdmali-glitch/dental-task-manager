import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const Tab = ({ to, children }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={
          'px-3 py-2 rounded-xl transition-colors ' +
          (active ? 'bg-blue-600 text-white shadow' : 'bg-white hover:bg-blue-50')
        }
      >
        {children}
      </Link>
    );
  };

  const canSeeUsers = ['ADMIN','HR','DIRECTOR'].includes(user?.role);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
      <div className="text-xl font-semibold">Dental Task Manager</div>
      <div className="flex gap-2">
        <Tab to="/">Dashboard</Tab>
        <Tab to="/tasks">Tasks</Tab>
        <Tab to="/rota">Rota</Tab>
        <Tab to="/messages">Messenger</Tab>
        {canSeeUsers && <Tab to="/users">Users</Tab>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">Signed in as <b>{user?.name}</b> ({user?.role})</span>
        <NotificationBell />
        <button onClick={logout} className="px-3 py-2 bg-red-600 text-white rounded-xl">Logout</button>
      </div>
    </div>
  );
}

