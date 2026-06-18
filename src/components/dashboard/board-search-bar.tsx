'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  className?: string;
};

export default function BoardSearchBar({ className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = useMemo(() => {
    const v = searchParams.get('q');
    return typeof v === 'string' ? v : '';
  }, [searchParams]);

  const [query, setQuery] = useState(initialQ);

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  const commit = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());

    const trimmed = nextQuery.trim();
    if (!trimmed) {
      params.delete('q');
    } else {
      params.set('q', trimmed);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={className}>
      <div className="flex items-center w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            commit(next);
          }}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm outline-none placeholder-slate-500 text-slate-900 dark:text-slate-50 dark:bg-[#0f172a] dark:border-slate-800"
        />
      </div>
    </div>
  );
}
