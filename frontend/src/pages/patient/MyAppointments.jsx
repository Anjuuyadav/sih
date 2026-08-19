import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiClock, FiLoader } from 'react-icons/fi';
import { getAppointments } from '../../services/patientService';

const planStatusClass = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-success-50 text-success-600 border-success-500/20',
  REJECTED: 'bg-error-50 text-error-600 border-error-500/20',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  COMPLETED: 'bg-primary-50 text-primary-700 border-primary-100',
};

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}`.includes('T') ? value : `${value}T00:00:00Z`));
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAppointments().then((items) => { if (active) setAppointments(items); }).catch(() => { if (active) setError('Unable to load your appointments. Please try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><Link to="/patient/dashboard" className="text-sm font-semibold text-primary-600">← Patient dashboard</Link><h1 className="mt-2 text-3xl font-semibold text-slate-900">My appointments</h1><p className="mt-1 text-slate-500">Every therapy plan and session in one place.</p></div><Link to="/patient/book" className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">Book a therapy</Link></header>
        {error && <div role="alert" className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}
        {loading ? <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500"><FiLoader className="animate-spin" /> Loading appointments...</div> : appointments.length ? <div className="space-y-5">{appointments.map((appointment) => <article key={appointment.therapyPlanId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold text-slate-900">{appointment.therapy?.therapyName}</h2><span className={`rounded-full border px-3 py-1 text-xs font-bold ${planStatusClass[appointment.status] || planStatusClass.PENDING}`}>{appointment.status}</span></div><p className="mt-2 text-sm text-slate-500">with {appointment.practitioner?.firstName} {appointment.practitioner?.lastName} · {appointment.practitioner?.specialization || 'Panchkarma practitioner'}</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wider text-slate-400">Total cost</p><p className="mt-1 text-lg font-semibold text-primary-700">{formatMoney(appointment.totalCost)}</p></div></div><div className="mt-5 grid gap-3 border-y border-slate-100 py-4 text-sm sm:grid-cols-4"><div><p className="text-xs text-slate-400">Sessions</p><p className="mt-1 font-semibold text-slate-700">{appointment.numberOfSessions}</p></div><div><p className="text-xs text-slate-400">Duration</p><p className="mt-1 font-semibold text-slate-700">{appointment.durationMinutes} min</p></div><div><p className="text-xs text-slate-400">Preferred start</p><p className="mt-1 font-semibold text-slate-700">{formatDate(appointment.preferredStartDate)}</p></div><div><p className="text-xs text-slate-400">Preferred time</p><p className="mt-1 font-semibold text-slate-700">{appointment.preferredTime}</p></div></div>{appointment.status === 'PENDING' && <p className="mb-4 text-sm font-medium text-amber-700">Waiting for practitioner confirmation</p>}{appointment.status === 'REJECTED' && <p className="mb-4 rounded-xl bg-error-50 px-3 py-2 text-sm text-error-600">{appointment.rejectionReason || 'Request rejected'}</p>}<h3 className="font-semibold text-slate-900">Sessions</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-2">Session</th><th className="pb-2">Date</th><th className="pb-2">Time</th><th className="pb-2">Status</th></tr></thead><tbody>{(appointment.sessions || []).map((session) => <tr key={session.sessionId} className="border-t border-slate-100"><td className="py-3 font-medium text-slate-700">{session.sessionNumber}</td><td className="py-3 text-slate-600">{formatDate(session.sessionDate)}</td><td className="py-3 text-slate-600">{session.startTime} - {session.endTime}</td><td className="py-3"><span className="font-semibold text-slate-700">{session.status}</span></td></tr>)}</tbody></table></div></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><FiCalendar className="mx-auto text-3xl text-primary-500" /><h2 className="mt-4 text-xl font-semibold text-slate-900">No appointments yet</h2><p className="mt-2 text-sm text-slate-500">You don&apos;t have any therapy appointments yet.</p><Link to="/patient/book" className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">Book your first therapy</Link></div>}
      </div>
    </div>
  );
};

export default MyAppointments;