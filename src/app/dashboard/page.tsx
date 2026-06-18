'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/theme-toggle';
import RequireAuth from '@/components/auth/RequireAuth';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';

type BoardItem = {
  id: string;
  title: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardItem[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const loadBoards = async () => {
    try {
      setIsLoadingBoards(true);
      setBoardsError(null);

      const res = await fetch('/api/boards', { method: 'GET' });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error((data?.error as string | undefined) ?? `Failed to load boards (${res.status}).`);
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
  }, []);

  const handleCreateFirstBoard = async () => {
    const trimmed = newBoardTitle.trim();
    if (!trimmed) {
      setCreateError('Board name is required.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data?.error as string | undefined) ?? `Failed to create board (${res.status}).`);
      }

      const data = await res.json();
      const boardId = data?.board?.id as string | undefined;
      if (!boardId) throw new Error('Board created but response missing id.');

      setIsCreateModalOpen(false);
      setNewBoardTitle('');
      await loadBoards();
      router.push(`/dashboard/board/${boardId}`);
    } catch (e: any) {
      console.error('Failed to create board:', e);
      setCreateError(e?.message ?? 'Failed to create board.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#f6f7fb] p-6 dark:from-slate-950 dark:to-slate-900">
        <DashboardNavbar />
        <div className="max-w-3xl mx-auto">
          <header className="mb-6 flex items-start justify-between gap-4 pt-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Boards</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Select a board to open its Kanban workspace.
              </p>
            </div>
            <div className="pt-1">
              <ThemeToggle />
            </div>
          </header>

          {isLoadingBoards ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
              Loading…
            </div>
          ) : boardsError ? (
            <div className="rounded-xl border border-rose-200 bg-white/70 p-6 text-sm text-rose-600">
              {boardsError}
            </div>
          ) : boards.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
              <div className="text-slate-900 font-bold text-lg">Welcome 👋</div>
              <p className="mt-2 text-sm text-slate-600">
                You don’t have any boards yet. Create your first board to get started.
              </p>

              {createError ? (
                <div className="mt-4 text-sm text-rose-600">{createError}</div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setNewBoardTitle('');
                  setIsCreateModalOpen(true);
                }}
                disabled={isCreating}
                className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                {isCreating ? 'Creating…' : 'Create your first board'}
              </button>

              {isCreateModalOpen ? (
                <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-lg rounded-xl bg-white shadow-lg ring-1 ring-black/10">
                    <div className="border-b px-4 py-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">Create new board</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          setCreateError(null);
                        }}
                        className="h-8 w-8 rounded-md hover:bg-slate-100 text-slate-600"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>

                    <div className="px-4 py-4">
                      <label className="block text-sm font-medium text-slate-700">
                        Board name
                        <input
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                          value={newBoardTitle}
                          onChange={(e) => setNewBoardTitle(e.target.value)}
                          placeholder="e.g. Product Roadmap"
                          autoFocus
                        />
                      </label>

                      {createError ? (
                        <div className="mt-3 text-sm text-rose-600">{createError}</div>
                      ) : null}

                      <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4">
                        <button
                          type="button"
                          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                          onClick={() => {
                            setIsCreateModalOpen(false);
                            setCreateError(null);
                          }}
                          disabled={isCreating}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={isCreating || newBoardTitle.trim().length === 0}
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
                          onClick={handleCreateFirstBoard}
                        >
                          {isCreating ? 'Creating…' : 'Create'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boards.map((b) => (
                <Link
                  key={b.id}
                  href={`/dashboard/board/${b.id}`}
                  className="rounded-xl border border-slate-200 bg-white/70 px-4 py-4 hover:bg-white transition shadow-sm"
                >
                  <div className="text-sm font-semibold text-slate-800">{b.title}</div>
                  <div className="text-xs text-slate-500 mt-1">Open Trello-style kanban</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
