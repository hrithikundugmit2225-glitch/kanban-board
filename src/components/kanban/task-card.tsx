'use client';

import { Draggable } from '@hello-pangea/dnd';
import { Task } from '@/types';
import { useBoardStore } from '@/store/use-board-store';

interface Props {
  boardId: string;
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
}

function formatDueDate(dueDate?: string) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function daysUntil(dueDate?: string) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((target - start) / (1000 * 60 * 60 * 24));
}

function hashColorClass(input: string) {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-sky-500',
    'bg-violet-500',
    'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function TaskCard({ boardId, task, index, onEdit }: Props) {
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const dueInDays = daysUntil(task.due_date);
  const dueLabel =
    dueInDays === null
      ? null
      : dueInDays < 0
        ? 'Overdue'
        : dueInDays === 0
          ? 'Due today'
          : null;

  const labelClass =
    dueInDays === null
      ? 'bg-slate-400 dark:bg-slate-600'
      : dueInDays < 0 || dueInDays <= 3
        ? 'bg-rose-500'
        : dueInDays <= 7
          ? 'bg-orange-500'
          : 'bg-emerald-500';

  const priorityBadge = (() => {
    switch (task.priority) {
      case 'HIGH':
        return { text: 'HIGH', className: 'bg-red-500' };
      case 'MEDIUM':
        return { text: 'MEDIUM', className: 'bg-amber-500' };
      case 'LOW':
      default:
        return { text: 'LOW', className: 'bg-emerald-500' };
    }
  })();

  const coverClass = hashColorClass(task.title);
  const assigneeInitial = (task.title?.trim()?.[0] ?? 'U').toUpperCase();
  const attachmentsCount = 0;
  const commentsCount = task.description ? Math.min(9, Math.max(1, task.description.length % 6)) : 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          /* Prevent draggable card collapse/overlap when many cards exist in a flex scroll container */
          className={[
            'group cursor-grab select-none overflow-hidden rounded-lg transition-all',
            'bg-white ring-1 ring-slate-200/60 shadow-sm border border-slate-200/60',
            'dark:bg-slate-950 dark:ring-slate-800/70 dark:border-slate-800/70 dark:shadow-sm',
            'flex flex-col w-full flex-shrink-0 min-h-[120px]',
            'border-l-4 border-indigo-600/90 dark:border-indigo-500/90',
            snapshot.isDragging
              ? 'cursor-grabbing ring-indigo-300/70 shadow-lg'
              : 'hover:-translate-y-[1px] hover:shadow-md dark:hover:shadow-lg',
          ].join(' ')}
        >
          {/* Card Cover */}
          <div
            className={[
              'relative h-16 overflow-hidden',
              coverClass,
              'flex items-center justify-start px-3 text-white',
            ].join(' ')}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#fff_0%,transparent_55%)]" />
            <span className="relative text-2xl leading-none">🗒️</span>
          </div>

          {/* Body */}
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span
                className={[
                  'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold text-slate-900 dark:text-indigo-200',
                  'bg-sky-100 ring-1 ring-sky-100/80 dark:bg-indigo-950/60 dark:ring-indigo-900/50',
                ].join(' ')}
                title="Category"
              >
                Feature
              </span>

              <div className="flex items-center gap-1">
                {/* Edit */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-50 focus:outline-none dark:text-slate-400"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="16 3 21 8 8 21 3 21 3 16 16 3" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteTask(boardId, task.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 focus:outline-none dark:text-slate-400"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="card-content">
              <h4 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                {task.title}
              </h4>
              {task.description ? (
                <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              ) : null}
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-[12px] text-slate-400 flex items-center gap-1">
                    <span aria-hidden="true">📎</span> {attachmentsCount}
                  </span>
                  <span className="text-[12px] text-slate-400 flex items-center gap-1">
                    <span aria-hidden="true">💬</span> {commentsCount}
                  </span>

                  {task.due_date ? (
                    <span className="text-[12px] flex items-center gap-1">
                      <span aria-hidden="true">📅</span>
                      <span className={['font-medium', dueInDays !== null && dueInDays < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
                        {formatDueDate(task.due_date) ?? 'Due'}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={['inline-flex items-center rounded px-2 py-0.5 text-[10.5px] font-semibold text-white', priorityBadge.className].join(' ')} title="Priority">
                    {priorityBadge.text}
                  </span>

                  {task.due_date ? (
                    <span className={['inline-flex items-center rounded px-2 py-0.5 text-[10.5px] font-semibold text-white', labelClass].join(' ')} title={dueLabel ?? 'Due'}>
                      {dueLabel ?? 'Due'}
                    </span>
                  ) : null}

                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm" title="Assignee">
                    <span className="text-[12px] font-semibold">{assigneeInitial}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}