'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAvatarInitials } from '@/lib/avatar';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function ProfileDropdown() {
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
    <div className="relative inline-block text-left" data-profile-dropdown-root>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm hover:opacity-95"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        {isLoading ? '…' : avatarInitials}
      </button>

      <div
        className={[
          isOpen ? 'block' : 'hidden',
          'absolute right-0 mt-2 w-64 rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden text-sm',
          'z-[9999]',
          'dark:bg-slate-950/95 dark:border-slate-800',
        ].join(' ')}
        role="menu"
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {isLoading ? 'Loading…' : displayName}
          </div>
          {email ? (
            <div className="text-xs text-slate-500 dark:text-slate-300 truncate">{email}</div>
          ) : null}
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
  );
}
