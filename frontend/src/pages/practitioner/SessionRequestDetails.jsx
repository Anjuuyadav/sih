import React, { useEffect, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiLoader,
  FiClock,
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000';

const statusClass = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  ACCEPTED: 'border-success-200 bg-success-50 text-success-700',
  REJECTED: 'border-error-200 bg-error-50 text-error-700',
  COMPLETED: 'border-blue-200 bg-blue-50 text-blue-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
};

const statusOf = (value) => String(value || 'PENDING').toUpperCase();

const formatMoney = (value) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const SessionRequestDetails = () => {
  const { therapyPlanId } = useParams();
  const { user, logout } = useContext(AuthContext);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const getToken = () => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken')
    );
  };

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/feedback/session-requests/${therapyPlanId}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load session request.');
      }

      const data = await response.json();

      setRequest(data.request || data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load session request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (therapyPlanId) {
      fetchRequest();
    }
  }, [therapyPlanId]);

  const accept = async () => {
    try {
      setAction('accept');
      setError('');
      setMessage('');

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/feedback/session-requests/${therapyPlanId}/accept`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to accept session request.'
        );
      }

      setMessage('Session request accepted successfully.');
      setRequest(data.request || data);

      await fetchRequest();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to accept request.');
    } finally {
      setAction('');
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      return;
    }

    try {
      setAction('reject');
      setError('');
      setMessage('');

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/feedback/session-requests/${therapyPlanId}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            rejectionReason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to reject session request.'
        );
      }

      setMessage('Session request rejected.');
      setShowReject(false);
      setReason('');

      setRequest(data.request || data);

      await fetchRequest();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to reject request.');
    } finally {
      setAction('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/practitioner/dashboard"
              className="flex items-center gap-2 text-sm font-semibold text-primary-600"
            >
              <FiArrowLeft />
              Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Session request details
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600"
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {message && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-success-500/20 bg-success-50 px-4 py-3 text-sm text-success-600"
          >
            {message}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
            <FiLoader className="animate-spin" />
            Loading request details...
          </div>
        ) : !request ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            Session request not found.
          </div>
        ) : (
          <>
            {(() => {
              const status = statusOf(request.status);
              const patient = request.patient || {};
              const therapy = request.therapy || {};
              const practitioner = request.practitioner || {};

              return (
                <>
                  {/* Request information */}
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
                          Patient:{' '}
                          {patient.name ||
                            'Patient information available'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          statusClass[status] ||
                          statusClass.PENDING
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Basic information */}
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                      <div>
                        <p className="text-xs text-slate-400">
                          Sessions
                        </p>
                        <p className="mt-1 font-semibold">
                          {request.numberOfSessions || 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Duration
                        </p>
                        <p className="mt-1 font-semibold">
                          {therapy.durationMinutes || 0} min
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Cost / session
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            therapy.costPerSession
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Total cost
                        </p>
                        <p className="mt-1 font-semibold text-primary-700">
                          {formatMoney(
                            request.totalCost ||
                              Number(
                                therapy.costPerSession || 0
                              ) *
                                Number(
                                  request.numberOfSessions || 0
                                )
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Schedule preferences */}
                    <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">

                      <div>
                        <p className="text-xs text-slate-400">
                          Preferred start
                        </p>
                        <p className="mt-1 font-semibold">
                          {formatDate(
                            request.preferredStartDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Preferred time
                        </p>
                        <p className="mt-1 font-semibold">
                          {request.preferredTime ||
                            'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Practitioner
                        </p>

                        <p className="mt-1 font-semibold">
                          {practitioner.firstName || ''}{' '}
                          {practitioner.lastName || ''}
                        </p>

                        <p className="text-sm text-slate-500">
                          {practitioner.specialization ||
                            'Practitioner'}
                        </p>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {status === 'REJECTED' &&
                      request.rejectionReason && (
                        <p className="mt-5 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
                          Reason: {request.rejectionReason}
                        </p>
                      )}

                    {/* Accept / reject buttons */}
                    {status === 'PENDING' && (
                      <div className="mt-6 flex flex-wrap gap-3">

                        <button
                          type="button"
                          disabled={Boolean(action)}
                          onClick={accept}
                          className="flex items-center gap-2 rounded-xl bg-success-600 px-5 py-3 text-sm font-semibold text-white hover:bg-success-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {action === 'accept' ? (
                            <FiLoader className="animate-spin" />
                          ) : (
                            <FiCheck />
                          )}

                          {action === 'accept'
                            ? 'Accepting...'
                            : 'Accept request'}
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(action)}
                          onClick={() => setShowReject(true)}
                          className="flex items-center gap-2 rounded-xl border border-error-200 px-5 py-3 text-sm font-semibold text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiX />
                          Reject request
                        </button>

                      </div>
                    )}
                  </section>

                  {/* Complete schedule */}
                  <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-2">
                      <FiClock className="text-primary-500" />

                      <h2 className="text-xl font-semibold text-slate-900">
                        Complete schedule
                      </h2>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="pb-3">
                              Session
                            </th>

                            <th className="pb-3">
                              Date
                            </th>

                            <th className="pb-3">
                              Start
                            </th>

                            <th className="pb-3">
                              End
                            </th>

                            <th className="pb-3">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {(request.sessions || []).map(
                            (session) => (
                              <tr
                                key={
                                  session.sessionId ||
                                  session.sessionNumber
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="py-3 font-semibold">
                                  {session.sessionNumber}
                                </td>

                                <td className="py-3">
                                  {formatDate(
                                    session.sessionDate
                                  )}
                                </td>

                                <td className="py-3">
                                  {session.startTime || '-'}
                                </td>

                                <td className="py-3">
                                  {session.endTime || '-'}
                                </td>

                                <td className="py-3 font-semibold">
                                  {statusOf(
                                    session.status
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              );
            })()}
          </>
        )}

        {/* Reject modal */}
        {showReject && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4"
          >
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="reject-title"
                    className="text-xl font-semibold text-slate-900"
                  >
                    Reject session request
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Provide a reason for the patient.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close rejection dialog"
                  onClick={() => setShowReject(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <FiX />
                </button>
              </div>

              <label
                htmlFor="rejectionReason"
                className="mt-5 block text-sm font-semibold text-slate-700"
              >
                Rejection reason

                <textarea
                  id="rejectionReason"
                  maxLength="500"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  rows="5"
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-primary-500"
                />
              </label>

              <p className="mt-1 text-right text-xs text-slate-400">
                {reason.length}/500
              </p>

              <div className="mt-5 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={() => setShowReject(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    !reason.trim() || Boolean(action)
                  }
                  onClick={reject}
                  className="flex items-center gap-2 rounded-xl bg-error-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action === 'reject' && (
                    <FiLoader className="animate-spin" />
                  )}

                  Reject request
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionRequestDetails;