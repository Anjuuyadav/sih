import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiLoader, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { getTrackingPatients } from '../../services/practitionerService';

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const formatTime = (value) => {
  if (!value) return '';
  const [hourText = '0', minuteText = '0'] = String(value).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return String(value);
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date);
};

const progressBarClass = (value) => {
  if (value >= 100) return 'bg-success-600';
  if (value >= 60) return 'bg-primary-600';
  return 'bg-amber-500';
};

const PractitionerTherapyTracking = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getTrackingPatients());
    } catch (requestError) {
      setError(requestError.message || 'Unable to load therapy tracking patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const cards = useMemo(() => items, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/practitioner/dashboard" className="text-sm font-semibold text-primary-600">
              &larr; Back to practitioner dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Therapy Tracking</h1>
            <p className="mt-1 text-slate-500">My patients with accepted therapy plans.</p>
          </div>
          <button type="button" onClick={loadPatients} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <FiRefreshCw /> Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
            <FiLoader className="animate-spin" /> Loading patients...
          </div>
        ) : cards.length ? (
          <div className="space-y-4">
            {cards.map((item) => {
              const nextSession = item.nextSession;
              const progress = Number(item.progressPercentage || 0);
              return (
                <article key={item.patient?.patientId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900">
                        <FiUsers className="text-primary-600" />
                        <h2 className="text-xl font-semibold">{item.patient?.name || 'Patient'}</h2>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">Therapies: {item.therapies?.length ? item.therapies.join(', ') : 'Therapy not available'}</p>
                      <p className="text-sm text-slate-500">Active plans: {item.planCount}</p>
                    </div>
                    <Link to={`/practitioner/therapy-tracking/${item.patient?.patientId}`} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                      View Therapy
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 border-y border-slate-100 py-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">Progress</p>
                      <p className="mt-1 font-semibold text-slate-700">{item.completedSessions} / {item.totalSessions} sessions</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Remaining</p>
                      <p className="mt-1 font-semibold text-slate-700">{item.remainingSessions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="mt-1 font-semibold text-slate-700">{item.status === 'COMPLETED' ? 'Completed' : 'In Progress'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${progressBarClass(progress)}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{progress}%</p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="flex items-center gap-2 font-semibold text-slate-700"><FiClock /> Next session</p>
                    {nextSession ? (
                      <p className="mt-1">{formatDate(nextSession.sessionDate)} - {formatTime(nextSession.startTime)}</p>
                    ) : (
                      <p className="mt-1">No upcoming confirmed sessions.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <h2 className="text-xl font-semibold text-slate-900">No active therapy patients</h2>
            <p className="mt-2 text-sm">Patients with accepted therapy sessions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PractitionerTherapyTracking;
