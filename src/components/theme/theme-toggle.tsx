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
      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white transition-colors dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {mounted && effectiveTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
