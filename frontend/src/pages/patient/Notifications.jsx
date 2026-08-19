import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiLoader } from 'react-icons/fi';
import { getNotifications } from '../../services/patientService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getNotifications().then((items) => { if (active) setNotifications(items); }).catch(() => { if (active) setError('Unable to load notifications. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8"><div className="mx-auto max-w-5xl"><header className="mb-8"><Link to="/patient/dashboard" className="text-sm font-semibold text-primary-600">← Patient dashboard</Link><h1 className="mt-2 text-3xl font-semibold text-slate-900">Notifications</h1><p className="mt-1 text-slate-500">Updates about your therapy requests.</p></header>{error && <div role="alert" className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}{loading ? <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500"><FiLoader className="animate-spin" /> Loading notifications...</div> : notifications.length ? <div className="space-y-3">{notifications.map((notification) => <article key={notification.NotificationId || notification.notificationId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FiBell className="text-primary-500" /><h2 className="font-semibold text-slate-900">{notification.Subject || notification.subject || notification.NotificationType || notification.notificationType}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{notification.Status || notification.status}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{notification.Message || notification.message}</p><p className="mt-3 text-xs text-slate-400">{notification.Channel || notification.channel} · {notification.CreatedAt || notification.createdAt}</p></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><FiBell className="mx-auto text-3xl text-primary-500" /><h2 className="mt-4 text-xl font-semibold text-slate-900">No notifications yet</h2><p className="mt-2 text-sm text-slate-500">Updates will appear here when your request changes.</p></div>}</div></div>;
};

export default Notifications;