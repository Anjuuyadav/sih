import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiClock, FiLoader, FiX } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import {
  acceptSessionRequest,
  getSessionRequestDetails,
  rejectSessionRequest,
} from '../../services/practitionerService';

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const statusClass = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-success-50 text-success-600 border-success-500/20',
  REJECTED: 'bg-error-50 text-error-600 border-error-500/20',
  COMPLETED: 'bg-primary-50 text-primary-700 border-primary-100',
};

const statusOf = (value) => String(value || 'PENDING').toUpperCase();

const getError = (error) => {
  if (error.status === 403) return 'You are not authorized to access practitioner requests.';
  if (error.status === 404) return 'Session request not found.';
  if (error.status === 409) return 'The request state changed. Please refresh before trying again.';
  if (!error.status) return 'Unable to connect to the server. Please try again.';
  return 'Something went wrong. Please try again.';
};

const SessionRequestDetails = () => {
  const { therapyPlanId } = useParams();
  const { logout } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRequest(await getSessionRequestDetails(therapyPlanId));
    } catch (requestError) {
      setError(getError(requestError));
    } finally {
      setLoading(false);
    }
  }, [therapyPlanId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const accept = async () => {
    if (action || statusOf(request?.status) !== 'PENDING') return;
    if (!window.confirm('Accepting confirms the complete requested schedule. Continue?')) return;

    setAction('accept');
    setError('');
    try {
      await acceptSessionRequest(therapyPlanId);
      setMessage('Session request accepted successfully.');
      await loadDetails();
    } catch (requestError) {
      setError(getError(requestError));
      await loadDetails();
    } finally {
      setAction('');
    }
  };

  const reject = async () => {
    if (action || !reason.trim() || reason.trim().length > 500) return;

    setAction('reject');
    setError('');
    try {
      await rejectSessionRequest(therapyPlanId, reason.trim());
      setMessage('Session request rejected successfully.');
      setShowReject(false);
      await loadDetails();
    } catch (requestError) {
      setError(getError(requestError));
      await loadDetails();
    } finally {
      setAction('');
    }
  };

  const renderRequest = () => {
    const status = statusOf(request.status);
    const patient = request.patient || {};
    const therapy = request.therapy || {};
    const practitioner = request.practitioner || {};

    return (
      <>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
                Booking request #{request.therapyPlanId}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {therapy.therapyName || 'Therapy request'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Patient: {patient.name || 'Patient information available'}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[status] || statusClass.PENDING}`}>
              {status}
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-slate-400">Sessions</p><p className="mt-1 font-semibold">{request.numberOfSessions}</p></div>
            <div><p className="text-xs text-slate-400">Duration</p><p className="mt-1 font-semibold">{therapy.durationMinutes} min</p></div>
            <div><p className="text-xs text-slate-400">Cost / session</p><p className="mt-1 font-semibold">{formatMoney(therapy.costPerSession)}</p></div>
            <div><p className="text-xs text-slate-400">Total cost</p><p className="mt-1 font-semibold text-primary-700">{formatMoney(request.totalCost || Number(therapy.costPerSession || 0) * Number(request.numberOfSessions || 0))}</p></div>
          </div>

          <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <div><p className="text-xs text-slate-400">Preferred start</p><p className="mt-1 font-semibold">{formatDate(request.preferredStartDate)}</p></div>
            <div><p className="text-xs text-slate-400">Preferred time</p><p className="mt-1 font-semibold">{request.preferredTime || 'Not specified'}</p></div>
            <div><p className="text-xs text-slate-400">Practitioner</p><p className="mt-1 font-semibold">{practitioner.firstName} {practitioner.lastName}</p><p className="text-sm text-slate-500">{practitioner.specialization}</p></div>
          </div>

          {status === 'REJECTED' && request.rejectionReason && (
            <p className="mt-5 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
              Reason: {request.rejectionReason}
            </p>
          )}

          {status === 'PENDING' && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={Boolean(action)} onClick={accept} className="flex items-center gap-2 rounded-xl bg-success-600 px-5 py-3 text-sm font-semibold text-white hover:bg-success-500 disabled:cursor-not-allowed disabled:opacity-60">
                {action === 'accept' ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {action === 'accept' ? 'Accepting...' : 'Accept request'}
              </button>
              <button type="button" disabled={Boolean(action)} onClick={() => setShowReject(true)} className="flex items-center gap-2 rounded-xl border border-error-200 px-5 py-3 text-sm font-semibold text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60">
                <FiX /> Reject request
              </button>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><FiClock className="text-primary-500" /><h2 className="text-xl font-semibold text-slate-900">Complete schedule</h2></div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Session</th><th className="pb-3">Date</th><th className="pb-3">Start</th><th className="pb-3">End</th><th className="pb-3">Status</th></tr></thead>
              <tbody>{(request.sessions || []).map((session) => <tr key={session.sessionId || session.sessionNumber} className="border-t border-slate-100"><td className="py-3 font-semibold">{session.sessionNumber}</td><td className="py-3">{formatDate(session.sessionDate)}</td><td className="py-3">{session.startTime}</td><td className="py-3">{session.endTime}</td><td className="py-3 font-semibold">{statusOf(session.status)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><Link to="/practitioner/dashboard" className="flex items-center gap-2 text-sm font-semibold text-primary-600"><FiArrowLeft /> Dashboard</Link><h1 className="mt-2 text-3xl font-semibold text-slate-900">Session request details</h1></div>
          <button type="button" onClick={logout} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Logout</button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}
        {message && <div role="status" className="mb-5 rounded-2xl border border-success-500/20 bg-success-50 px-4 py-3 text-sm text-success-600">{message}</div>}

        {loading ? (
          <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500"><FiLoader className="animate-spin" /> Loading request details...</div>
        ) : request ? (
          renderRequest()
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Session request not found.</div>
        )}

        {showReject && (
          <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4"><div><h2 id="reject-title" className="text-xl font-semibold text-slate-900">Reject session request</h2><p className="mt-1 text-sm text-slate-500">Provide a reason for the patient.</p></div><button type="button" aria-label="Close rejection dialog" onClick={() => setShowReject(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><FiX /></button></div>
              <label htmlFor="rejectionReason" className="mt-5 block text-sm font-semibold text-slate-700">Rejection reason<textarea id="rejectionReason" maxLength="500" value={reason} onChange={(event) => setReason(event.target.value)} rows="5" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-primary-500" /></label>
              <p className="mt-1 text-right text-xs text-slate-400">{reason.length}/500</p>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowReject(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={!reason.trim() || Boolean(action)} onClick={reject} className="flex items-center gap-2 rounded-xl bg-error-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-500 disabled:cursor-not-allowed disabled:opacity-50">{action === 'reject' && <FiLoader className="animate-spin" />} Reject request</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionRequestDetails;
