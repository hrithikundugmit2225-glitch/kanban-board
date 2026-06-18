'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedName) return setError('Name is required.');
    if (!trimmedEmail) return setError('Email is required.');
    if (trimmedPassword.length < 6) return setError('Password must be at least 6 characters.');

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: { name: trimmedName },
        },
      });

      if (signUpErr) throw signUpErr;

      // If the user is already signed in (e.g., no email confirmation), redirect.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        router.replace('/dashboard');
        return;
      }

      // Otherwise, they may need to confirm email (handled by Supabase).
      if (data?.user) {
        setError('Check your email to confirm your account, then log in.');
      } else {
        setError('Sign up successful. Please check your email to confirm your account.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#f6f7fb] dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-6 dark:border-slate-800 dark:bg-slate-950/40">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create account</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Set up your profile and boards.</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-700 hover:underline dark:text-indigo-300">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
