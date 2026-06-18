'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

function parseResetParams() {
  // Supabase recovery links typically put tokens in the URL hash:
  // #access_token=...&refresh_token=...&type=recovery
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search);

  const accessToken =
    hashParams.get('access_token') ??
    searchParams.get('access_token') ??
    searchParams.get('accessToken') ??
    null;

  const refreshToken = hashParams.get('refresh_token') ?? searchParams.get('refresh_token') ?? null;

  return { accessToken, refreshToken };
}

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccess(null);

    const { accessToken: at, refreshToken: rt } = parseResetParams();
    setAccessToken(at);
    setRefreshToken(rt);
  }, []);

  const isTokenMissing = useMemo(() => !accessToken || !refreshToken, [accessToken, refreshToken]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isTokenMissing) {
      setError('Invalid or expired reset link. Please request a new password reset.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { error: setSessionErr } = await supabase.auth.setSession({
        access_token: accessToken as string,
        refresh_token: refreshToken as string,
      });

      if (setSessionErr) throw setSessionErr;

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) throw updateErr;

      setSuccess('Password updated successfully. Redirecting to login…');
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#f6f7fb] dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-6 dark:border-slate-800 dark:bg-slate-950/40">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Update password</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter a new password. This page uses the recovery token from your reset email link.
        </p>

        {isTokenMissing ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
            Reset token missing. Use the “Forgot password” link to request a new reset email.
          </div>
        ) : null}

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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">New password</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-300"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isTokenMissing}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>

          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:bg-slate-900/30 dark:ring-slate-800 dark:hover:bg-slate-900/50"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
