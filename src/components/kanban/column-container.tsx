'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Column, Task } from '@/types';
import TaskCard from './task-card';

interface Props {
  boardId: string;
  column: Column;
  searchQuery: string;
  onAddTask: (column: Column) => void;
  onEditTask: (task: Task) => void;

  // Column management (drag + insert)
  columnIndex: number;
  onInsertColumnAfter: (positionAfterIndex: number) => void;
  dragHandleProps?: any;
  isColumnDragging?: boolean;
}

function columnAccent(columnTitle: string) {
  const accents = [
    { className: 'bg-blue-500', rgb: '59 130 246' },
    { className: 'bg-violet-500', rgb: '139 92 246' },
    { className: 'bg-fuchsia-500', rgb: '217 70 239' },
    { className: 'bg-emerald-500', rgb: '16 185 129' },
    { className: 'bg-amber-500', rgb: '245 158 11' },
    { className: 'bg-sky-500', rgb: '14 165 233' },
  ];

  let hash = 0;
  for (let i = 0; i < columnTitle.length; i++) {
    hash = (hash + columnTitle.charCodeAt(i) * 31) % 997;
  }
  const idx = Math.abs(hash) % accents.length;
  return { className: accents[idx].className, rgb: accents[idx].rgb };
}

export default function ColumnContainer({
  boardId,
  column,
  searchQuery,
  onAddTask,
  onEditTask,
  columnIndex,
  onInsertColumnAfter,
  dragHandleProps,
  isColumnDragging,
}: Props) {
  const { className: accentClass, rgb: accentRgb } = columnAccent(column.title);

  const query = searchQuery.trim().toLowerCase();

  // Visible tasks participate in drag/drop, so filter them out entirely.
  const visibleTasks =
    query.length === 0
      ? column.tasks
      : column.tasks.filter((t) => {
          const title = (t.title ?? '').toLowerCase();
          const desc = (t.description ?? '').toLowerCase();
          return title.includes(query) || desc.includes(query);
        });

  // IMPORTANT: keep your existing add-button logic based on real data,
  // not on the filtered view.
  const hasCards = column.tasks.length > 0;
  const isEmpty = column.tasks.length === 0;

  // columnIndex is guaranteed by props for proper insert positioning
  const insertAt = columnIndex + 1;

  return (
    <div
      className={[
        'flex w-[300px] shrink-0 flex-col rounded-xl bg-slate-200/50 border border-slate-200/60 p-3.5 shadow-sm dark:bg-slate-800/50 dark:border-slate-800 transition-colors duration-200',
        isColumnDragging ? 'opacity-90' : '',
      ].join(' ')}
    >
      {/* List header */}
      <div className="flex items-center justify-between gap-3 px-1 mb-3 group">
        <div className="flex items-center gap-2 min-w-0">
          {/* Column drag handle */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Drag column ${column.title}`}
            title="Drag column"
            className={[
              'h-7 w-7 rounded-md',
              'bg-white/60 dark:bg-slate-800/40 hover:bg-white/90 dark:hover:bg-slate-800',
              'border border-slate-200/60 dark:border-slate-700',
              'text-slate-700 dark:text-slate-100',
              'flex items-center justify-center',
              'cursor-grab active:cursor-grabbing',
              // subtle by default, fully visible on header hover
              'opacity-40 group-hover:opacity-100',
              'transition-opacity duration-150',
              'select-none touch-none',
            ].join(' ')}
            {...(dragHandleProps ?? {})}
          >
            <span className="text-[13px] leading-none">⋮⋮</span>
          </div>

          <span className={`h-2.5 w-2.5 rounded-full ${accentClass} opacity-95`} />
          <h3 className="truncate text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-100">
            {column.title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Conditional top '+' (visible only when column has cards) */}
          {column.tasks.length > 0 ? (
            <button
              type="button"
              onClick={() => onAddTask(column)}
              aria-label={`Add task to ${column.title}`}
              title="Add a card"
              className={[
                'h-7 w-7 rounded-md border flex items-center justify-center transition-opacity',
                'border-slate-200/70 dark:border-slate-700',
                'text-indigo-600 dark:text-indigo-400',
                'bg-white/60 dark:bg-slate-800/40',
                'hover:bg-white/90 dark:hover:bg-slate-800',
                // always fully visible
                'opacity-100',
                'duration-150',
              ].join(' ')}
            >
              <span className="text-[14px] font-semibold leading-none">+</span>
            </button>
          ) : null}

          {/* Delete column: subtle by default, fully visible on header hover */}
          <button
            type="button"
            aria-label={`Delete ${column.title}`}
            title="Delete column"
            className={[
              'h-7 w-7 rounded-md border flex items-center justify-center transition-opacity',
              'border-rose-200 dark:border-rose-900/40',
              'text-rose-700 dark:text-rose-200',
              'bg-rose-50/60 dark:bg-rose-900/10',
              'hover:bg-rose-100/90 dark:hover:bg-rose-900/25',
              // subtle default visibility (not hidden)
              'opacity-40 group-hover:opacity-100',
              'duration-150',
            ].join(' ')}
            onClick={async () => {
              // eslint-disable-next-line no-alert
              const ok = window.confirm(`Delete column "${column.title}"?`);
              if (!ok) return;
              await fetch(`/api/boards/${boardId}/columns/${column.id}`, { method: 'DELETE' });
              // simple refresh: reload board data by full page refresh to keep state consistent
              window.location.reload();
            }}
          >
            <span className="text-[14px] leading-none">×</span>
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

      {/* Card list */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={[
              'flex min-h-[40px] flex-col gap-2.5 overflow-visible overflow-x-hidden pr-1 px-0 py-3 rounded-lg transition-colors',
              snapshot.isDraggingOver ? 'bg-slate-200/50 dark:bg-slate-800/80' : 'bg-transparent',
            ].join(' ')}
          >
            {visibleTasks.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-2 py-6 text-[12px] text-slate-400 dark:text-slate-400">
                No tasks found
              </div>
            ) : (
              visibleTasks
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((task, index) => (
                  <TaskCard
                    key={task.id}
                    boardId={boardId}
                    task={task}
                    index={index}
                    onEdit={onEditTask}
                  />
                ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Bottom footer:
          - Big "Add a card" button ONLY when column is empty
          - Otherwise render nothing (so it doesn’t duplicate add controls)
      */}
      {isEmpty ? (
        <div className="px-0 pt-2 pb-1">
          <button
            type="button"
            onClick={() => onAddTask(column)}
            style={{ ['--accent-rgb' as string]: accentRgb }}
            className="mt-0 flex w-full py-2 items-center justify-center gap-1.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-[rgba(var(--accent-rgb),0.14)] dark:hover:bg-[rgba(var(--accent-rgb),0.2)] text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-dashed border-indigo-200 dark:border-slate-700 transition-all"
          >
            <span className="inline-flex">
              <i className="fa-solid fa-plus text-[10px]" />
            </span>
            Add a card
          </button>
        </div>
      ) : null}
    </div>
  );
}
