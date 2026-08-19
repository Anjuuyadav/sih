import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiLoader, FiUserPlus } from 'react-icons/fi';
import { registerPatient } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');
    setIsLoading(true);

    const normalizedName = String(formData.name || '').trim();
    const normalizedEmail = String(formData.email || '').trim();
    const normalizedContactNumber = String(formData.contactNumber || '')
      .trim()
      .replace(/\s+/g, '');

    if (!normalizedName || !normalizedEmail || !normalizedContactNumber || !formData.password || !formData.confirmPassword) {
      setError('All fields are required.');
      setIsLoading(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(normalizedContactNumber)) {
      setError('Contact Number must be a valid 10-digit Indian mobile number.');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password must match.');
      setIsLoading(false);
      return;
    }

    try {
      await registerPatient({
        name: normalizedName,
        email: normalizedEmail,
        contactNumber: normalizedContactNumber,
        password: formData.password,
      });

      setSuccess('Registration successful. You can sign in now.');
      setToast({
        type: 'success',
        message: 'Account created successfully. Please sign in.',
      });

      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Registration failed. Please try again.';

      setError(message);

      setToast({
        type: 'error',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">

          {/* Left Section */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 text-white lg:p-10">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <div className="rounded-2xl bg-white/20 p-2">
                <FiHeart />
              </div>
              Panchkarma Care
            </div>

            <h1 className="mt-8 text-3xl font-semibold leading-tight">
              Create your patient account
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
              Start your care journey with a secure profile for appointments
              and wellness support.
            </p>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-blue-50">
              Your information stays protected and only used for care
              coordination.
            </div>
          </div>

          {/* Right Section */}
          <div className="p-6 sm:p-8 lg:p-10">

            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500">
                Patient registration
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Create a secure account
              </h2>
            </div>

            {/* Toast */}
            {toast && (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                  toast.type === 'success'
                    ? 'border-success-500/20 bg-success-50 text-success-600'
                    : 'border-error-500/20 bg-error-50 text-error-600'
                }`}
              >
                {toast.message}
              </div>
            )}

            <form
              className="space-y-4"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* Name */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="name"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="email"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="contactNumber"
                >
                  Contact Number
                </label>

                <input
                  id="contactNumber"
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter your 10-digit mobile number"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="rounded-2xl border border-success-500/20 bg-success-50 px-4 py-3 text-sm text-success-600">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <FiUserPlus className="mr-2" />
                    Create account
                  </>
                )}
              </button>
            </form>

            {/* Login */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 transition hover:text-primary-700"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;