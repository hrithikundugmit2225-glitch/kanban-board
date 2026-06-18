'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAvatarInitials } from '@/lib/avatar';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function DashboardNavbar() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>('Account');
  const [email, setEmail] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        const user = data.session?.user;
        if (!user) {
          setDisplayName('Account');
          setEmail(null);
          return;
        }

        const nameFromMetadata = (user.user_metadata as any)?.name as string | undefined;
        if (cancelled) return;

        setDisplayName(nameFromMetadata || user.email || 'Account');
        setEmail(user.email ?? null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-profile-dropdown-root]')) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  const avatarInitials = useMemo(() => createAvatarInitials(displayName), [displayName]);

  return (
    <div className="flex items-center justify-between w-full px-6 py-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-950/30">
      {/* Left slot (kept for alignment; the page already renders the Kanban logo/title) */}
      <div className="flex items-center min-w-0" />

      {/* Profile (top-right on the exact same row) */}
      <div className="relative inline-block text-left" data-profile-dropdown-root>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/70 hover:bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Open profile menu"
          aria-expanded={isOpen}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
            {isLoading ? '…' : avatarInitials}
          </span>
          <span className="hidden sm:inline text-slate-800 dark:text-slate-100 font-semibold max-w-[160px] truncate">
            {isLoading ? 'Loading…' : displayName}
          </span>
        </button>

        <div
          className={[
            isOpen ? 'block' : 'hidden',
            'absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden text-sm',
            'z-50',
            'dark:bg-slate-950/95 dark:border-slate-800',
          ].join(' ')}
          role="menu"
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {isLoading ? 'Loading…' : displayName}
            </div>
            {email ? <div className="text-xs text-slate-500 dark:text-slate-300 truncate">{email}</div> : null}
          </div>

          <button
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-rose-600 dark:text-rose-400"
            onClick={async () => {
              const supabase = getSupabaseClient();
              await supabase.auth.signOut();
              setIsOpen(false);
              router.replace('/login');
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
