'use client';

import React, { useEffect, useState } from 'react';
import { DragDropContext, DropResult, Draggable, Droppable } from '@hello-pangea/dnd';
import { useBoardStore } from '@/store/use-board-store';
import ColumnContainer from './column-container';
import TaskEditor from './task-editor';
import { Column, Task } from '@/types';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Props = {
  boardId: string;
  calendarOpen: boolean;
  onCloseCalendar: () => void;
};

type EditorState =
  | { open: false }
  | { open: true; mode: 'create'; column: Column }
  | { open: true; mode: 'edit'; task: Task };

export default function KanbanBoard({ boardId, calendarOpen, onCloseCalendar }: Props) {
  const {
    columns,
    moveTask,
    setColumns,
    createTask,
    updateTask,
    loadBoard,
    createColumn,
    reorderColumns,
  } = useBoardStore();

  const allTasks = columns.flatMap((c) => c.tasks ?? []);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false });

  useEffect(() => {
    let cancelled = false;

    async function getAccessToken() {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const token = await getAccessToken();

        const res = await fetch(`/api/boards/${boardId}`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          throw new Error(`Failed to load board (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        const loadedColumns = Array.isArray(data?.columns) ? data.columns : [];

        setColumns({
          columns: loadedColumns,
          boardTitle: data?.board?.title ?? undefined,
        });

        if (!Array.isArray(data?.columns)) {
          setError('Board loaded but response had no columns.');
        }
      } catch (e: any) {
        console.error('Failed to load board:', e);
        if (!cancelled) {
          setColumns({ columns: [] });
          setError(e?.message ?? 'Failed to load board.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [boardId, setColumns]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Column reordering (outer drag)
    if (type === 'COLUMN') {
      const ordered = columns
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id);

      const [removed] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, removed);

      // Persist to backend (Supabase)
      await reorderColumns(boardId, ordered);

      // Re-sync from DB so positions are correct
      await loadBoard(boardId);
      return;
    }

    // Task movement (inner drag)
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    // Optimistic UI update
    moveTask(draggableId, sourceColId, destColId, source.index, destination.index);

    // Persist to backend (Supabase)
    await fetch(`/api/boards/${boardId}/move-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: draggableId,
        sourceColId,
        destColId,
        sourceIndex: source.index,
        destIndex: destination.index,
      }),
    });

    // Re-sync from DB so the card status/column_id reflects the backend.
    await loadBoard(boardId);
  };

  const handleAddTask = (column: Column) => {
    setEditor({ open: true, mode: 'create', column });
  };

  const handleEditTask = (task: Task) => {
    setEditor({ open: true, mode: 'edit', task });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300 bg-transparent">
        Loading board...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300 bg-transparent">
        {error ?? 'No columns found for this board.'}
      </div>
    );
  }

  const parseDueDateToYMD = (d?: string | null): string | null => {
    if (!d) return null;
    if (typeof d !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  const tasksByDueDate = allTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const ymd = parseDueDateToYMD(task.due_date ?? null);
    if (!ymd) return acc;
    acc[ymd] = acc[ymd] ? [...acc[ymd], task] : [task];
    return acc;
  }, {});

  const CalendarOverlay = () => {
    const [activeDate, setActiveDate] = useState(() => new Date());
    const [mode, setMode] = useState<'month' | 'week'>('month');

    useEffect(() => {
      if (calendarOpen) return;
    }, [calendarOpen]);

    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();

    const monthFirst = new Date(year, month, 1);
    const monthLast = new Date(year, month + 1, 0);

    const monthStartDow = monthFirst.getDay(); // 0=Sun
    const daysInMonth = monthLast.getDate();

    const weekStart = new Date(activeDate);
    weekStart.setDate(activeDate.getDate() - weekStart.getDay());

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });

    const monthCells: Date[] = [];
    // leading blanks
    for (let i = 0; i < monthStartDow; i++) monthCells.push(new Date(year, month, 1 - monthStartDow + i));
    // actual month days
    for (let day = 1; day <= daysInMonth; day++) monthCells.push(new Date(year, month, day));
    // trailing to complete 6 rows (42 cells) like common Trello-ish calendars
    while (monthCells.length < 42) {
      const last = monthCells[monthCells.length - 1];
      monthCells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    const headerLabel = mode === 'month'
      ? activeDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
      : `Week of ${weekStart.toLocaleDateString()}`;

    const renderCell = (d: Date) => {
      const ymd = d.toISOString().slice(0, 10);
      const tasks = tasksByDueDate[ymd] ?? [];
      const isInMonth = d.getMonth() === month;

      return (
        <button
          type="button"
          key={ymd}
          onClick={() => setActiveDate(d)}
          className={[
            'group flex min-h-[92px] w-full flex-col rounded-md border border-slate-200/70 bg-white/70 p-2 text-left',
            'hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/40',
            !isInMonth && mode === 'month' ? 'opacity-45' : '',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {d.getDate()}
            </div>
            {tasks.length > 0 ? (
              <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full dark:bg-indigo-900/30 dark:text-indigo-200">
                {tasks.length}
              </div>
            ) : null}
          </div>

          <div className="mt-2 space-y-1 overflow-hidden">
            {tasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="truncate text-[12px] leading-4 font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-200"
                title={t.title}
              >
                {t.title}
              </div>
            ))}
            {tasks.length > 3 ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                +{tasks.length - 3} more
              </div>
            ) : null}
          </div>
        </button>
      );
    };

    return (
      <div className="fixed inset-0 z-[100000] bg-slate-900/40 backdrop-blur-sm">
        <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white/90 dark:bg-slate-950/90 border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800/70 px-4 py-3">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{headerLabel}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {tasksByDueDate ? 'Tasks mapped by due date' : ''}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('month')}
                  className={[
                    'flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border shadow-sm transition-all relative z-[100000]',
                    'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200',
                    'dark:bg-slate-950/60 dark:hover:bg-slate-900/90 dark:text-indigo-200 dark:border-indigo-800/80',
                    mode === 'month' ? 'bg-indigo-50 dark:bg-indigo-900/30' : '',
                  ].join(' ')}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setMode('week')}
                  className={[
                    'flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border shadow-sm transition-all relative z-[100000]',
                    'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200',
                    'dark:bg-slate-950/60 dark:hover:bg-slate-900/90 dark:text-indigo-200 dark:border-indigo-800/80',
                    mode === 'week' ? 'bg-indigo-50 dark:bg-indigo-900/30' : '',
                  ].join(' ')}
                >
                  Week
                </button>

                <button
                  type="button"
                  onClick={() => onCloseCalendar()}
                  className="rounded-md border border-slate-200 bg-white/70 hover:bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              {mode === 'month' ? (
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                    <div key={w} className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                      {w}
                    </div>
                  ))}
                  {monthCells.map((d) => renderCell(d))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((d) => (
                    <div key={d.toISOString()} className="grid gap-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}{' '}
                        <span className="font-semibold">{d.getDate()}</span>
                      </div>
                      {renderCell(d)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200/70 dark:border-slate-800/70 text-xs text-slate-600 dark:text-slate-300">
              Tip: Click a date to focus it. Only task titles with a valid <span className="font-semibold">due_date</span> are shown.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {editor.open ? (
        <TaskEditor
          mode={editor.mode}
          initial={editor.mode === 'edit' ? editor.task : null}
          onCancel={() => setEditor({ open: false })}
          onSubmit={async (input) => {
            try {
              if (editor.mode === 'create') {
                await createTask(boardId, { ...input, column_id: editor.column.id });
              } else {
                await updateTask(boardId, editor.task.id, input);
              }
              setEditor({ open: false });
            } catch (e) {
              console.error('Failed to submit task:', e);
              // Keep modal open so the user can retry.
            }
          }}
        />
      ) : null}

      {calendarOpen ? <CalendarOverlay /> : null}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full w-full flex-col bg-transparent">
          <main className="flex-1 overflow-x-auto p-5">
            {/* Responsive columns:
                - Large screens: center columns
                - Small screens: allow horizontal scroll */}
            <Droppable droppableId="kanban-columns" direction="horizontal" type="COLUMN">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={[
                    'flex w-max gap-4 items-start justify-center lg:justify-center',
                    snapshot.isDraggingOver ? 'opacity-95' : '',
                  ].join(' ')}
                >
                  {columns
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((col, idx) => (
                      <Draggable key={col.id} draggableId={col.id} index={idx}>
                        {(colProvided, colSnapshot) => (
                          <div
                            ref={colProvided.innerRef}
                            {...colProvided.draggableProps}
                            style={colProvided.draggableProps.style}
                          >
                            <ColumnContainer
                              boardId={boardId}
                              column={col}
                              columnIndex={idx}
                              searchQuery={searchQuery}
                              onAddTask={handleAddTask}
                              onEditTask={handleEditTask}
                              // remove column insert UI by providing a no-op handler
                              onInsertColumnAfter={() => {}}
                              dragHandleProps={colProvided.dragHandleProps}
                              isColumnDragging={colSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </main>
        </div>
      </DragDropContext>
    </>
  );
}
