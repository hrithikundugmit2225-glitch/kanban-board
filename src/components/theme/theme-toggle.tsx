'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  return (
    <button
      type="button"
      onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded border border-indigo-200 shadow-sm transition-all relative z-[100000] dark:bg-slate-950/60 dark:hover:bg-slate-900 dark:text-indigo-200 dark:border-indigo-800/80"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {mounted && effectiveTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
