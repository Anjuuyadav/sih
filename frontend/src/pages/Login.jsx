import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiLoader, FiShield } from 'react-icons/fi';
import { login } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

const getRoleRedirect = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'patient') return '/patient/dashboard';
  if (normalizedRole === 'practitioner') return '/practitioner/dashboard';
  return '/dashboard';
};

const Login = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      navigate(getRoleRedirect(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login(formData);
      const loggedInUser = { ...response.user, role: String(response.user?.role || '').trim().toLowerCase() };
      setUser(loggedInUser);
      setToast({ type: 'success', message: 'Welcome back! Redirecting to your dashboard.' });
      navigate(getRoleRedirect(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setToast({ type: 'error', message: err.response?.data?.message || 'Login failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-gradient-to-br from-primary-600 to-primary-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-3 text-lg font-semibold">
                <div className="rounded-2xl bg-white/20 p-2"><FiShield /></div>
                Panchkarma Care
              </div>
              <h1 className="mt-8 text-3xl font-semibold leading-tight">Secure access to personalized healthcare services.</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
                Sign in to manage appointments, treatment plans, and patient records with confidence.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-blue-50">
              Trusted by patients and clinicians for safe digital care.
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">Welcome back</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-slate-500">Access your care dashboard securely.</p>
            </div>

            {toast && (
              <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-success-500/20 bg-success-50 text-success-600' : 'border-error-500/20 bg-error-50 text-error-600'}`}>
                {toast.message}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><FiMail /></span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><FiLock /></span>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {error && <div className="rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
              >
                {isLoading ? <><FiLoader className="mr-2 animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 transition hover:text-primary-700">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
