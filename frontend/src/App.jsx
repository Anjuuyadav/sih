import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminManagement from './pages/admin/AdminManagement';
import BookTherapy from './pages/patient/BookTherapy';
import MyAppointments from './pages/patient/MyAppointments';
import Notifications from './pages/patient/Notifications';
import PractitionerDashboard from './pages/practitioner/PractitionerDashboard';
import SessionRequestDetails from './pages/practitioner/SessionRequestDetails';

const Dashboard = () => {
  const { user, logout } = React.useContext(AuthContext);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-lg font-semibold text-slate-900">Panchkarma</p>
            <p className="text-sm text-slate-500">
              Welcome back, {user?.name || 'Patient'}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-error-500 hover:text-error-500"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">
                Care Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Your wellness journey starts here.
              </h1>

              <p className="mt-3 max-w-2xl text-base text-slate-600">
                Manage appointments, access reports, and stay connected with
                your care team in one secure place.
              </p>
            </div>

            <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
              Secure access • Role: {user?.role || 'Patient'}
            </div>
          </div>
        </section>

        {String(user?.role || '').toLowerCase() === 'patient' && (
          <section className="grid gap-4 sm:grid-cols-3">
            <Link to="/patient/book" className="rounded-2xl bg-primary-600 p-5 text-white shadow-sm transition hover:bg-primary-700">
              <p className="text-sm font-semibold">Book a therapy</p>
              <p className="mt-2 text-sm text-blue-100">Find a practitioner for your complete schedule.</p>
            </Link>
            <Link to="/patient/appointments" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">My appointments</p>
              <p className="mt-2 text-sm text-slate-500">Review plans, sessions, and statuses.</p>
            </Link>
            <Link to="/patient/notifications" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="mt-2 text-sm text-slate-500">See updates about your requests.</p>
            </Link>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Appointments',
              description: 'Book and manage your next consultation',
              tone: 'bg-primary-50 text-primary-700',
            },
            {
              title: 'Reports',
              description: 'Review your treatment history and updates',
              tone: 'bg-success-50 text-success-600',
            },
            {
              title: 'Profile',
              description: 'Keep your personal and emergency details updated',
              tone: 'bg-slate-100 text-slate-700',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div
                className={`inline-flex rounded-2xl px-3 py-2 text-sm font-semibold ${item.tone}`}
              >
                {item.title}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          {/* Admin Routes */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['admin']}
                redirectTo="/dashboard"
              />
            }
          >
            <Route path="/admin" element={<AdminManagement />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['patient']}
                redirectTo="/dashboard"
              />
            }
          >
            <Route path="/patient/dashboard" element={<Dashboard />} />
            <Route path="/patient/book" element={<BookTherapy />} />
            <Route path="/patient/appointments" element={<MyAppointments />} />
            <Route path="/patient/notifications" element={<Notifications />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['practitioner']}
                redirectTo="/dashboard"
              />
            }
          >
            <Route path="/practitioner/dashboard" element={<PractitionerDashboard />} />
            <Route path="/practitioner/session-requests/:therapyPlanId" element={<SessionRequestDetails />} />
          </Route>

          {/* Patient Routes */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={['patient', 'practitioner']}
                redirectTo="/dashboard"
              />
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Dashboard />} />
            <Route path="/appointments" element={<Dashboard />} />
            <Route path="/reports" element={<Dashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;