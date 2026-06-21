'use client';

import { use, useState } from 'react';
import KanbanBoard from '@/components/kanban/kanban-board';
import BoardDropdown from '@/components/dashboard/board-dropdown';
import ThemeToggle from '@/components/theme/theme-toggle';
import BoardSearchBar from '@/components/dashboard/board-search-bar';
import ProfileDropdown from '@/components/dashboard/ProfileDropdown';
import RequireAuth from '@/components/auth/RequireAuth';
import Image from 'next/image';

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { boardId } = use(params);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0f172a] dark:text-slate-50 transition-colors duration-200">
        <header className="relative flex flex-col sm:flex-row sm:items-center px-6 py-5 z-[100] gap-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm overflow-visible dark:border-slate-800/50 dark:bg-slate-950/50">
          <div className="flex w-full items-center gap-4">
            {/* Left: logo + title */}
            <div className="flex flex-1 items-center gap-4 min-w-0">
              <div className="shrink-0 flex items-center justify-center">
                <Image
                  src="/board.png"
                  alt="Kanban Board Logo"
                  width={44}
                  height={44}
                  className="object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                    Kanban Workspace
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100">
                      Trello
                    </span>
                  </h1>
                </div>

                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Manage your team's tasks and sprints
                </p>
              </div>
            </div>

            {/* Center: Search + Board dropdown (between left and right) */}
            <div className="flex flex-none items-center justify-center gap-3 min-w-0">
              {/* Search bar sits in the middle */}
              <div className="hidden sm:block w-[260px] min-w-[220px]">
                <BoardSearchBar />
              </div>

              {/* Responsive: show search on smaller screens as well */}
              <div className="sm:hidden w-full max-w-[320px]">
                <BoardSearchBar />
              </div>

              <div className="flex items-center gap-3">
                <BoardDropdown selectedBoardId={boardId} boards={[1, 2, 3, 4, 5]} />
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded border border-indigo-200 shadow-sm transition-all relative z-[100000] dark:bg-slate-950/60 dark:hover:bg-slate-900 dark:text-indigo-200 dark:border-slate-800/80"
                  aria-label="Open calendar"
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
                      d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
                    />
                  </svg>
                  <span>Calendar</span>
                </button>
              </div>
            </div>

            {/* Right: theme toggle + profile dropdown (same bar, far-right) */}
            <div className="flex flex-1 items-center justify-end shrink-0 gap-4">
              <ThemeToggle />
              <ProfileDropdown />
            </div>
          </div>
        </header>

        <main className="flex flex-col flex-1 overflow-hidden">
          <KanbanBoard boardId={boardId} calendarOpen={calendarOpen} onCloseCalendar={() => setCalendarOpen(false)} />
        </main>
      </div>
    </RequireAuth>
  );
}
