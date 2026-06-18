import KanbanBoard from '@/components/kanban/kanban-board';
import BoardDropdown from '@/components/dashboard/board-dropdown';
import ThemeToggle from '@/components/theme/theme-toggle';
import BoardSearchBar from '@/components/dashboard/board-search-bar';
import ProfileDropdown from '@/components/dashboard/ProfileDropdown';
import RequireAuth from '@/components/auth/RequireAuth';
import Image from 'next/image';

interface BoardPageProps {
  params: { boardId: string } | Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

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

              <BoardDropdown selectedBoardId={boardId} boards={[1, 2, 3, 4, 5]} />
            </div>

            {/* Right: theme toggle + profile dropdown (same bar, far-right) */}
            <div className="flex flex-1 items-center justify-end shrink-0 gap-4">
              <ThemeToggle />
              <ProfileDropdown />
            </div>
          </div>
        </header>

        <main className="flex flex-col flex-1 overflow-hidden">
          <KanbanBoard boardId={boardId} />
        </main>
      </div>
    </RequireAuth>
  );
}
