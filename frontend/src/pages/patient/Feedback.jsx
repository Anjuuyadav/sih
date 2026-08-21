import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiLoader, FiMessageSquare } from 'react-icons/fi';
import { submitFeedback } from '../../services/feedbackService';
import { normalizeApiError } from '../../services/apiClient';

const Feedback = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!text.trim()) {
      setError('Please enter your feedback before submitting.');
      return;
    }

    if (text.trim().length < 5) {
      setError('Please enter a little more detail in your feedback.');
      return;
    }

    setError('');
    setResult(null);
    setSubmitting(true);

    try {
      const response = await submitFeedback(text.trim());

      setResult(response);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to analyze your feedback. Please try again.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getSentimentStyle = (sentiment) => {
    if (sentiment === 'Positive') {
      return 'border-success-500/30 bg-success-50 text-success-600';
    }

    if (sentiment === 'Negative') {
      return 'border-error-500/30 bg-error-50 text-error-600';
    }

    return 'border-amber-500/30 bg-amber-50 text-amber-700';
  };

  const handleNewFeedback = () => {
    setText('');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8">
          <Link
            to="/patient/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            <FiArrowLeft />
            Patient dashboard
          </Link>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary-600">
              Patient feedback
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Share your therapy experience
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Tell us about your Panchkarma therapy experience. Your feedback
              will be analyzed to understand your experience better.
            </p>
          </div>
        </header>

        {!result ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <FiMessageSquare size={22} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  How was your experience?
                </h2>
                <p className="text-sm text-slate-500">
                  Your honest feedback helps improve patient care.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              <label
                htmlFor="feedback"
                className="text-sm font-semibold text-slate-700"
              >
                Your feedback
              </label>

              <textarea
                id="feedback"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError('');
                }}
                placeholder="Example: The therapy was relaxing and the practitioner was very helpful..."
                rows={7}
                maxLength={1000}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />

              <div className="mt-2 flex justify-end text-xs text-slate-400">
                {text.length}/1000
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-2xl border border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Analyzing feedback...
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Submit feedback
                  </>
                )}
              </button>

            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
                <FiCheck size={26} />
              </div>

              <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                Feedback analyzed
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Thank you for sharing your experience.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your feedback
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-700">
                "{result.feedback}"
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div
                className={`rounded-2xl border p-5 ${getSentimentStyle(
                  result.sentiment
                )}`}
              >
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Sentiment
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {result.sentiment}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Confidence
                </p>

                <p className="mt-2 text-2xl font-bold text-primary-700">
                  {Number(result.confidence).toFixed(2)}%
                </p>
              </div>

            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={handleNewFeedback}
                className="flex-1 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Submit another feedback
              </button>

              <Link
                to="/patient/dashboard"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to dashboard
              </Link>

            </div>

          </section>
        )}

      </div>
    </div>
  );
};

export default Feedback;