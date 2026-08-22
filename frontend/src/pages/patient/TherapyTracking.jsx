import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { getTherapyTracking } from '../../services/patientService';

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const formatTime = (value) => {
  if (!value) return '--';
  const [hourText = '0', minuteText = '0'] = String(value).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return String(value);
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date);
};

const TherapyTracking = () => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTracking = async () => {
    setLoading(true);
    setError('');
    try {
      setTracking(await getTherapyTracking());
    } catch (requestError) {
      setError(requestError.message || 'Unable to load therapy tracking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
  }, []);

  const plans = useMemo(() => tracking?.plans || [], [tracking]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/patient/dashboard" className="text-sm font-semibold text-primary-600">
              &larr; Back to patient dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Therapy Tracking</h1>
            <p className="mt-1 text-slate-500">Track your therapy progress and session history.</p>
          </div>
          <button type="button" onClick={loadTracking} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <FiRefreshCw /> Refresh
          </button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
            <FiLoader className="animate-spin" /> Loading therapy tracking...
          </div>
        ) : tracking ? (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Overall Progress</h2>
              <p className="mt-1 text-sm text-slate-500">{tracking.completedSessions} / {tracking.totalSessions} sessions completed</p>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-primary-600" style={{ width: `${Math.min(tracking.progressPercentage, 100)}%` }} /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Completed</p><p className="mt-1 text-2xl font-semibold text-success-600">{tracking.completedSessions}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Remaining</p><p className="mt-1 text-2xl font-semibold text-amber-600">{tracking.remainingSessions}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Total</p><p className="mt-1 text-2xl font-semibold text-slate-800">{tracking.totalSessions}</p></div>
              </div>
            </section>

            <div className="mt-6 space-y-5">
              {plans.map((plan) => (
                <article key={plan.therapyPlanId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{plan.therapy?.therapyName || 'Therapy'}</h3>
                      <p className="mt-1 text-sm text-slate-500">Practitioner: {plan.practitioner?.firstName} {plan.practitioner?.lastName}</p>
                      <p className="text-sm text-slate-500">Treatment plan #{plan.therapyPlanId}</p>
                    </div>
                    <p className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{plan.status}</p>
                  </div>

                  <div className="mt-4 grid gap-3 border-y border-slate-100 py-4 text-sm sm:grid-cols-4">
                    <div><p className="text-xs text-slate-400">Completed</p><p className="mt-1 font-semibold text-success-600">{plan.completedSessions}</p></div>
                    <div><p className="text-xs text-slate-400">Remaining</p><p className="mt-1 font-semibold text-amber-600">{plan.remainingSessions}</p></div>
                    <div><p className="text-xs text-slate-400">Total</p><p className="mt-1 font-semibold text-slate-700">{plan.totalSessions}</p></div>
                    <div><p className="text-xs text-slate-400">Progress</p><p className="mt-1 font-semibold text-primary-700">{plan.progressPercentage}%</p></div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <section>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FiClock className="text-primary-600" /> Upcoming Sessions</h4>
                      {plan.upcomingSessions.length ? (
                        <div className="mt-3 space-y-3">
                          {plan.upcomingSessions.map((session) => (
                            <div key={session.sessionId} className="rounded-2xl border border-slate-200 p-3 text-sm">
                              <p className="font-semibold text-slate-800">{formatDate(session.sessionDate)}</p>
                              <p className="mt-1 text-slate-600">{formatTime(session.startTime)} - {formatTime(session.endTime)}</p>
                              <p className="mt-1 font-semibold text-slate-700">{session.status}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No upcoming sessions.</div>
                      )}
                    </section>

                    <section>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FiCheckCircle className="text-success-600" /> Completed Sessions</h4>
                      {plan.completedSessionHistory.length ? (
                        <div className="mt-3 space-y-3">
                          {plan.completedSessionHistory.map((session) => (
                            <div key={session.sessionId} className="rounded-2xl border border-success-200 bg-success-50 p-3 text-sm">
                              <p className="font-semibold text-slate-800">{formatDate(session.sessionDate)}</p>
                              <p className="mt-1 text-slate-600">{formatTime(session.startTime)} - {formatTime(session.endTime)}</p>
                              <p className="mt-1 font-semibold text-success-700">Completed</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No completed sessions yet.</div>
                      )}
                    </section>
                  </div>
                </article>
              ))}
            </div>

            {!plans.length && (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                No scheduled sessions found.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No tracking data found.</div>
        )}
      </div>
    </div>
  );
};

export default TherapyTracking;
