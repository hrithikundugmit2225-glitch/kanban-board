'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  selectedBoardId: string;
  boards?: number[];
};

type BoardItem = {
  id: string;
  title: string;
  is_starred: boolean;
};

export default function BoardDropdown({ selectedBoardId }: Props) {
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isLimitReached = useMemo(() => boards.length >= 10, [boards.length]);

  const loadBoards = async () => {
    try {
      setIsLoadingBoards(true);
      setBoardsError(null);

      const res = await fetch('/api/boards', { method: 'GET' });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg = (data?.error as string | undefined) ?? `Failed to load boards (${res.status})`;
        throw new Error(msg);
      }

      const items: BoardItem[] = Array.isArray(data?.boards) ? data.boards : [];
      setBoards(items);
    } catch (e: any) {
      console.error('Failed to load boards:', e);
      setBoardsError(e?.message ?? 'Failed to load boards.');
    } finally {
      setIsLoadingBoards(false);
    }
  };

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    setCreateError(null);
    setNewBoardTitle('');
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setCreateError(data?.error ?? 'Maximum of 10 boards reached.');
          return;
        }
        setCreateError(data?.error ?? `Failed to create board (${res.status}).`);
        return;
      }

      const data = await res.json();
      const boardId = data?.board?.id as string | undefined;
      if (!boardId) {
        setCreateError('Board created but response missing id.');
        return;
      }

      await loadBoards();

      setIsCreateOpen(false);
      setIsDropdownOpen(false);
      router.push(`/dashboard/board/${boardId}`);
    } catch (e: any) {
      console.error('Failed to create board:', e);
      setCreateError(e?.message ?? 'Failed to create board.');
    } finally {
      setIsCreating(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const favorites = boards.filter((b) => b.is_starred);
  const allBoards = boards.filter((b) => !b.is_starred);

  const filterBySearch = (arr: BoardItem[]) => {
    if (!normalizedSearch) return arr;
    return arr.filter((b) => b.title.toLowerCase().includes(normalizedSearch));
  };

  const filteredFavorites = filterBySearch(favorites);
  const filteredAllBoards = filterBySearch(allBoards);

  const boardRow = (b: BoardItem) => (
    <div
      key={b.id}
      className={[
        'flex items-center justify-between gap-2',
        b.id === selectedBoardId ? 'bg-indigo-50/40' : 'bg-transparent',
      ].join(' ')}
    >
      <Link
        href={`/dashboard/board/${b.id}`}
        className={[
          'flex-1 block px-4 py-2 hover:bg-slate-50 transition-colors',
          b.id === selectedBoardId ? 'text-indigo-600 font-semibold' : 'text-slate-700',
        ].join(' ')}
        onClick={() => setIsDropdownOpen(false)}
      >
        {b.title}
      </Link>

      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const next = !b.is_starred;
          try {
            const res = await fetch(`/api/boards/${b.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_starred: next }),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              alert(data?.error ?? `Failed to update favorite (${res.status}).`);
              return;
            }

            await loadBoards();
          } catch (err: any) {
            console.error('Failed to toggle favorite:', err);
            alert(err?.message ?? 'Failed to toggle favorite.');
          }
        }}
        className="mx-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        title={b.is_starred ? 'Unpin from favorites' : 'Pin to favorites'}
        aria-label={b.is_starred ? `Unpin ${b.title}` : `Pin ${b.title}`}
      >
        <span className="text-[13px]">{b.is_starred ? '★' : '☆'}</span>
      </button>

      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const ok = window.confirm(`Delete board "${b.title}"?`);
          if (!ok) return;

          try {
            const res = await fetch(`/api/boards/${b.id}`, { method: 'DELETE' });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              alert(data?.error ?? `Failed to delete board (${res.status}).`);
              return;
            }

            setIsDropdownOpen(false);
            await loadBoards();

            const currentPath = window.location.pathname;
            const isOnDeletedBoard =
              currentPath === `/dashboard/board/${b.id}` || currentPath.endsWith(`/dashboard/board/${b.id}`);

            if (isOnDeletedBoard) {
              const res2 = await fetch('/api/boards', { method: 'GET' });
              const data2 = await res2.json().catch(() => ({}));
              const remaining: { id: string; title: string }[] = Array.isArray(data2?.boards) ? data2.boards : [];

              if (remaining.length > 0) {
                router.push(`/dashboard/board/${remaining[0].id}`);
              } else {
                router.push('/dashboard');
              }
            }
          } catch (err: any) {
            console.error('Failed to delete board:', err);
            alert(err?.message ?? 'Failed to delete board.');
          }
        }}
        className="mx-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        title="Delete board"
        aria-label={`Delete board ${b.title}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="relative inline-block text-left z-[9999] overflow-visible">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded border border-indigo-200 shadow-sm transition-all relative z-[100000] dark:bg-slate-950/60 dark:hover:bg-slate-900 dark:text-indigo-200 dark:border-slate-800/80"
      >
        <svg
          className="w-3.5 h-3.5 text-slate-600 dark:text-slate-200/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span>Board</span>
        <svg
          className="w-3 h-3 text-slate-500 ml-0.5 dark:text-slate-200/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen ? (
        <div
          className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-[9999] text-xs font-medium text-slate-700 dark:bg-slate-950/95 dark:border-slate-800 dark:text-slate-200"
          role="menu"
        >
          <div className="px-4 py-2 text-[11px] font-semibold text-slate-500 border-b border-slate-100 dark:text-slate-300 dark:border-slate-800">
            {isLoadingBoards ? 'Loading…' : 'Your boards'}
          </div>

          <div className="px-4 pt-3 pb-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search boards…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-200 dark:focus:border-indigo-300"
              aria-label="Search boards"
            />
          </div>

          {boardsError ? (
            <div className="px-4 py-2 text-[11px] text-rose-600 dark:text-rose-300">{boardsError}</div>
          ) : null}

          {!boardsError && !isLoadingBoards && boards.length === 0 ? (
            <div className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-300">No boards found.</div>
          ) : null}

          {filteredFavorites.map(boardRow)}

          {filteredFavorites.length > 0 ? (
            <div className="px-4 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">Favorites</div>
          ) : null}

          {filteredAllBoards.map(boardRow)}

          <div className="border-t border-slate-100 my-1 dark:border-slate-800" />

          <button
            type="button"
            disabled={isLimitReached}
            onClick={() => {
              setIsDropdownOpen(false);
              startCreate();
            }}
          className={[
            'w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors dark:hover:bg-slate-900/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isLimitReached ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-700 dark:text-indigo-200',
          ].join(' ')}
          >
            Create New Board
          </button>

          {isLimitReached ? (
            <div className="px-4 pb-3 pt-0.5 text-[11px] text-rose-600 dark:text-rose-300">
              Maximum of 10 boards reached.
            </div>
          ) : null}
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lg ring-1 ring-black/10 dark:bg-slate-950/95 dark:ring-slate-800">
            <div className="border-b px-4 py-3 flex items-center justify-between dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create new board</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Board name
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-200 dark:focus:border-indigo-300"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Product Roadmap"
                  autoFocus
                />
              </label>

              {createError ? (
                <div className="mt-3 text-sm text-rose-600 dark:text-rose-300">{createError}</div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/30 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-900/50"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isCreating || newBoardTitle.trim().length === 0 || isLimitReached}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
                  onClick={submitCreate}
                >
                  {isCreating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
