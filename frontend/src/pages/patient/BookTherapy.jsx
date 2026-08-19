import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCalendar, FiCheck, FiClock, FiLoader, FiSearch } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import { createBooking, getPatientTherapies, searchAvailability } from '../../services/patientService';

const days = [
  ['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4],
  ['Friday', 5], ['Saturday', 6], ['Sunday', 7],
];

const today = new Date().toISOString().slice(0, 10);
const initialPreferences = { numberOfSessions: '1', preferredStartDate: '', preferredDays: [], preferredTime: '10:00' };

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getErrorMessage = (error, fallback) => {
  if (error.status === 401) return 'Your session has expired. Please log in again.';
  if (error.status === 403) return 'You do not have permission to access this page.';
  if (error.status === 409) return 'That schedule is no longer available. Please search availability again.';
  if (!error.status) return 'Unable to connect to the server. Please try again.';
  return error.message || fallback;
};

const PatientDetails = ({ user }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Patient information</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Your care profile</h2>
      </div>
      <div className="rounded-2xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700">From your account</div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs uppercase tracking-wider text-slate-400">Name</p><p className="mt-1 font-medium text-slate-800">{user?.name || 'Patient'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 font-medium text-slate-800">{user?.email || 'Available on your account'}</p></div>
      <div><p className="text-xs uppercase tracking-wider text-slate-400">Contact</p><p className="mt-1 font-medium text-slate-800">Use the contact number saved to your profile</p></div>
    </div>
  </section>
);

const Schedule = ({ schedule }) => (
  <div className="mt-4 space-y-2">
    {schedule.map((session) => (
      <div key={session.sessionNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-700">Session {session.sessionNumber}</span>
        <span className="text-slate-600">{formatDate(session.date || session.sessionDate)}</span>
        <span className="font-medium text-primary-700">{session.startTime} - {session.endTime}</span>
      </div>
    ))}
  </div>
);

const BookTherapy = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [therapies, setTherapies] = useState([]);
  const [therapy, setTherapy] = useState(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [practitioners, setPractitioners] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPatientTherapies()
      .then((items) => { if (active) setTherapies(items); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError, 'Unable to load therapies.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const estimatedTotal = useMemo(
    () => Number(therapy?.cost || 0) * Number(preferences.numberOfSessions || 0),
    [therapy, preferences.numberOfSessions]
  );

  const updatePreference = (name, value) => {
    setPreferences((current) => ({ ...current, [name]: value }));
    setPractitioners([]);
    setSelectedPractitioner(null);
  };

  const toggleDay = (day) => {
    const nextDays = preferences.preferredDays.includes(day)
      ? preferences.preferredDays.filter((value) => value !== day)
      : [...preferences.preferredDays, day].sort((first, second) => first - second);
    updatePreference('preferredDays', nextDays);
  };

  const validatePreferences = () => {
    if (!therapy) return 'Select a therapy first.';
    if (!Number.isInteger(Number(preferences.numberOfSessions)) || Number(preferences.numberOfSessions) < 1) return 'Number of sessions must be greater than zero.';
    if (!preferences.preferredStartDate || preferences.preferredStartDate < today) return 'Choose today or a future start date.';
    if (!preferences.preferredDays.length) return 'Select at least one preferred day.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(preferences.preferredTime)) return 'Choose a valid preferred time.';
    return '';
  };

  const findPractitioners = async () => {
    const validationError = validatePreferences();
    if (validationError) { setError(validationError); return; }
    setError('');
    setSearching(true);
    try {
      const response = await searchAvailability({
        therapyId: therapy.therapyId,
        numberOfSessions: Number(preferences.numberOfSessions),
        preferredStartDate: preferences.preferredStartDate,
        preferredDays: preferences.preferredDays,
        preferredTime: preferences.preferredTime,
      });
      setPractitioners((response.practitioners || []).filter((item) => item.allSessionsAvailable));
      setSelectedPractitioner(null);
      setStep(3);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to search availability.'));
    } finally { setSearching(false); }
  };

  const submitBooking = async () => {
    if (!selectedPractitioner?.schedule?.length || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const response = await createBooking({
        therapyId: therapy.therapyId,
        numberOfSessions: Number(preferences.numberOfSessions),
        preferredStartDate: preferences.preferredStartDate,
        preferredDays: preferences.preferredDays,
        preferredTime: preferences.preferredTime,
        practitionerId: selectedPractitioner.practitionerId,
        schedule: selectedPractitioner.schedule.map((session) => ({
          sessionNumber: session.sessionNumber,
          sessionDate: session.date || session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
        })),
      });
      setSuccess(response.data || response);
      setStep(5);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to submit your booking request.'));
      if (requestError.status === 409) {
        setPractitioners([]);
        setSelectedPractitioner(null);
        setStep(3);
      }
    } finally { setSubmitting(false); }
  };

  const resetBooking = () => {
    setStep(1); setTherapy(null); setPreferences(initialPreferences); setPractitioners([]); setSelectedPractitioner(null); setSuccess(null); setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><Link to="/patient/dashboard" className="text-sm font-semibold text-primary-600">← Patient dashboard</Link><h1 className="mt-2 text-3xl font-semibold text-slate-900">Book a therapy</h1><p className="mt-1 text-slate-500">Build a complete schedule with your care team.</p></div>
          <Link to="/patient/appointments" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">My appointments</Link>
        </header>

        <div className="mb-6 grid grid-cols-5 gap-2">
          {['Therapy', 'Preferences', 'Availability', 'Review', 'Submitted'].map((label, index) => <div key={label} className={`rounded-xl px-2 py-3 text-center text-xs font-semibold sm:text-sm ${step === index + 1 ? 'bg-primary-600 text-white' : step > index + 1 ? 'bg-success-50 text-success-600' : 'bg-white text-slate-400'} border border-slate-200`}>{index + 1}. {label}</div>)}
        </div>

        {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600"><span>{error}</span>{error.includes('no longer available') && <button type="button" onClick={() => { setError(''); setStep(2); }} className="font-semibold underline">Search again</button>}</div>}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <main className="space-y-6">
            {step === 1 && <><PatientDetails user={user} /><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Step 1</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Choose your therapy</h2>{loading ? <p className="mt-6 text-sm text-slate-500">Loading therapies...</p> : therapies.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{therapies.map((item) => <button type="button" key={item.therapyId} onClick={() => { setTherapy(item); setError(''); }} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${therapy?.therapyId === item.therapyId ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100' : 'border-slate-200 bg-white'}`}><h3 className="font-semibold text-slate-900">{item.therapyName}</h3><p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{item.description || 'A personalized Panchkarma therapy session.'}</p><div className="mt-4 flex justify-between text-sm font-semibold text-primary-700"><span><FiClock className="mr-1 inline" />{item.duration} min</span><span>{formatMoney(item.cost)} / session</span></div></button>)}</div> : <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No therapies are currently available.</p>}<button type="button" disabled={!therapy} onClick={() => setStep(2)} className="mt-6 flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300">Continue <FiArrowRight /></button></section></>}

            {step === 2 && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Step 2</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Configure your preferences</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Number of sessions<input type="number" min="1" step="1" value={preferences.numberOfSessions} onChange={(event) => updatePreference('numberOfSessions', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-primary-500" /></label><label className="text-sm font-semibold text-slate-700">Preferred start date<input type="date" min={today} value={preferences.preferredStartDate} onChange={(event) => updatePreference('preferredStartDate', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-primary-500" /></label><label className="text-sm font-semibold text-slate-700">Preferred time<input type="time" value={preferences.preferredTime} onChange={(event) => updatePreference('preferredTime', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-primary-500" /></label></div><fieldset className="mt-6"><legend className="text-sm font-semibold text-slate-700">Preferred weekdays</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{days.map(([label, value]) => <label key={value} className={`cursor-pointer rounded-xl border px-3 py-3 text-sm transition ${preferences.preferredDays.includes(value) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><input type="checkbox" checked={preferences.preferredDays.includes(value)} onChange={() => toggleDay(value)} className="mr-2" />{label}</label>)}</div></fieldset><div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"><FiArrowLeft /> Back</button><button type="button" onClick={findPractitioners} disabled={searching} className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300">{searching ? <><FiLoader className="animate-spin" /> Searching...</> : <><FiSearch /> Find available practitioners</>}</button></div></section>}

            {step === 3 && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Step 3</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Select a practitioner</h2></div><button type="button" onClick={() => setStep(2)} className="text-sm font-semibold text-primary-600">Edit preferences</button></div>{practitioners.length ? <div className="mt-6 space-y-4">{practitioners.map((item) => <article key={item.practitionerId} className={`rounded-2xl border p-5 ${selectedPractitioner?.practitionerId === item.practitionerId ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-slate-900">{item.firstName} {item.lastName}</h3><p className="mt-1 text-sm text-slate-500">{item.specialization || 'Panchkarma practitioner'}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wider text-success-600">Complete schedule available</p></div><button type="button" onClick={() => { setSelectedPractitioner(item); setStep(4); }} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Select practitioner</button></div><Schedule schedule={item.schedule || []} /></article>)}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">No practitioner can accommodate all requested sessions.</div>}</section>}

            {step === 4 && selectedPractitioner && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Step 4</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">Review your booking</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-slate-400">Therapy</p><p className="mt-1 font-semibold">{therapy.therapyName}</p><p className="text-sm text-slate-500">{therapy.duration} min · {formatMoney(therapy.cost)} per session</p></div><div><p className="text-xs uppercase tracking-wider text-slate-400">Practitioner</p><p className="mt-1 font-semibold">{selectedPractitioner.firstName} {selectedPractitioner.lastName}</p><p className="text-sm text-slate-500">{selectedPractitioner.specialization || 'Panchkarma practitioner'}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-400">Preferences</p><p className="mt-1 text-sm text-slate-600">{preferences.numberOfSessions} sessions from {formatDate(preferences.preferredStartDate)}</p><p className="text-sm text-slate-600">Preferred time: {preferences.preferredTime}</p></div><div><p className="text-xs uppercase tracking-wider text-slate-400">Estimated total</p><p className="mt-1 text-xl font-semibold text-primary-700">{formatMoney(estimatedTotal)}</p><p className="text-xs text-slate-500">Final amount is confirmed by the backend.</p></div></div><h3 className="mt-8 font-semibold text-slate-900">Generated schedule</h3><Schedule schedule={selectedPractitioner.schedule || []} /><div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setStep(3)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"><FiArrowLeft /> Back</button><button type="button" disabled={submitting} onClick={submitBooking} className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300">{submitting ? <><FiLoader className="animate-spin" /> Submitting...</> : <><FiCheck /> Confirm booking</>}</button></div></section>}

            {step === 5 && <section className="rounded-3xl border border-success-500/30 bg-success-50 p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white"><FiCheck size={26} /></div><h2 className="mt-5 text-2xl font-semibold text-slate-900">Booking request submitted</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">Your therapy request has been sent to the practitioner for confirmation. Its current status is <strong>PENDING</strong>.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to="/patient/appointments" className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">View my appointments</Link><button type="button" onClick={resetBooking} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Book another therapy</button></div></section>}
          </main>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">Current selection</p><h2 className="mt-3 font-semibold text-slate-900">{therapy?.therapyName || 'Choose a therapy'}</h2>{therapy && <><p className="mt-2 text-sm text-slate-500">{therapy.duration} minutes per session</p><p className="mt-1 text-sm font-semibold text-primary-700">{formatMoney(therapy.cost)} per session</p></>}<div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500"><p>Sessions: <strong className="text-slate-800">{preferences.numberOfSessions}</strong></p><p className="mt-2">Preferred time: <strong className="text-slate-800">{preferences.preferredTime}</strong></p></div></aside>
        </div>
      </div>
    </div>
  );
};

export default BookTherapy;