import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiLoader, FiLogOut, FiRefreshCw } from 'react-icons/fi';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getSessionRequests } from '../../services/practitionerService';

const statusClass = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-success-50 text-success-600 border-success-500/20',
  REJECTED: 'bg-error-50 text-error-600 border-error-500/20',
  COMPLETED: 'bg-primary-50 text-primary-700 border-primary-100',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const displayStatus = (value) => String(value || 'PENDING').toUpperCase();
const errorMessage = (error) => {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 403) return 'You are not authorized to access practitioner requests.';
  if (error.status === 404) return 'Session request not found.';
  if (error.status === 409) return 'The request state changed. Refreshing the latest requests is recommended.';
  if (!error.status) return 'Unable to connect to the server. Please try again.';
  return 'Something went wrong while loading session requests.';
};

const PractitionerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setRequests(await getSessionRequests()); } catch (requestError) { setError(errorMessage(requestError)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const filteredRequests = useMemo(() => requests.filter((request) => filter === 'ALL' || displayStatus(request.status) === filter), [requests, filter]);
  const pendingCount = requests.filter((request) => displayStatus(request.status) === 'PENDING').length;
  const confirmedCount = requests.filter((request) => displayStatus(request.status) === 'CONFIRMED').length;
  const rejectedCount = requests.filter((request) => displayStatus(request.status) === 'REJECTED').length;
  const completedSessions = requests.reduce((total, request) => total + (request.sessions || []).filter((session) => displayStatus(session.status) === 'COMPLETED').length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">Panchkarma Care</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Practitioner Dashboard</h1><p className="mt-1 text-slate-500">Welcome back{user?.name ? `, ${user.name}` : ''}. Review incoming therapy requests.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/practitioner/therapy-tracking" className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700">Therapy Tracking</Link>
            <button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><FiLogOut /> Logout</button>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600"><span>{error}</span><button type="button" onClick={loadRequests} className="flex items-center gap-2 font-semibold underline"><FiRefreshCw /> Retry</button></div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          ['Pending Requests', pendingCount, 'text-amber-700', FiClock], ['Confirmed Requests', confirmedCount, 'text-success-600', FiCheckCircle], ['Rejected Requests', rejectedCount, 'text-error-600', FiAlertCircle], ['Completed Sessions', completedSessions, 'text-primary-700', FiCalendar],
        ].map(([label, value, color, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon className={color} /></div><p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p></div>)}</section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Session requests</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Patient therapy requests</h2></div><div className="flex flex-wrap gap-2">{['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'].map((value) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${filter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{value[0] + value.slice(1).toLowerCase()}</button>)}</div></div>
          {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><FiLoader className="animate-spin" /> Loading session requests...</div> : filteredRequests.length ? <div className="mt-5 space-y-4">{filteredRequests.map((request) => { const status = displayStatus(request.status); const therapy = request.therapy || {}; const patient = request.patient || {}; return <article key={request.therapyPlanId} className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold text-slate-900">{therapy.therapyName || 'Therapy request'}</h3><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[status] || statusClass.PENDING}`}>{status}</span></div><p className="mt-2 text-sm text-slate-500">Patient: {patient.name || 'Patient information available in details'}</p></div><Link to={`/practitioner/session-requests/${request.therapyPlanId}`} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">View details</Link></div><div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4"><div><p className="text-xs text-slate-400">Sessions</p><p className="mt-1 font-semibold text-slate-700">{request.numberOfSessions}</p></div><div><p className="text-xs text-slate-400">Preferred start</p><p className="mt-1 font-semibold text-slate-700">{formatDate(request.preferredStartDate)}</p></div><div><p className="text-xs text-slate-400">Preferred time</p><p className="mt-1 font-semibold text-slate-700">{request.preferredTime || 'Not specified'}</p></div><div><p className="text-xs text-slate-400">Cost</p><p className="mt-1 font-semibold text-primary-700">{formatMoney(request.therapy?.costPerSession)}</p></div></div></article>; })}</div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{requests.length ? 'No requests found for this status.' : 'No session requests yet. New patient booking requests will appear here.'}</div>}
        </section>
      </div>
    </div>
  );
};

export default PractitionerDashboard;