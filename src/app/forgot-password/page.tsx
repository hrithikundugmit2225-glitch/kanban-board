'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Use the app's update-password route to capture the recovery token.
        // Supabase will redirect there after the user clicks the email link.
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetErr) throw resetErr;

      setSuccess('Check your email for the password reset link.');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background image for entire page */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/login bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Subtle, light overlay so the card content stays soft + readable */}
      <div className="absolute inset-0 -z-10 bg-white/65 dark:bg-slate-950/65" />

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-6 dark:border-slate-800 dark:bg-slate-950/40 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter your email and we’ll send you a reset link.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30"
          >
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
