'use client';

import React, { useMemo, useState } from 'react';
import { Task } from '@/types';

type TaskInput = {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
};

type Props = {
  mode: 'create' | 'edit';
  initial?: Task | null;
  onCancel: () => void;
  onSubmit: (input: TaskInput) => void;
};

function toDateInputValue(dueDate?: string | null): string {
  if (!dueDate) return '';
  // dueDate might be ISO string; Date will normalize.
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function TaskEditor({ mode, initial, onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState<string>(() => toDateInputValue(initial?.due_date ?? null));
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>(initial?.priority ?? 'LOW');

  const submitDisabled = useMemo(() => title.trim().length === 0, [title]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg ring-1 ring-black/10 dark:ring-1 dark:ring-slate-800">
        <div className="border-b px-4 py-3 border-slate-200/60 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'Add task' : 'Edit task'}
          </h2>
        </div>

        <form
          className="px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (submitDisabled) return;

            const due = dueDate.trim().length === 0 ? null : dueDate;

            onSubmit({
              title: title.trim(),
              description: description.trim().length === 0 ? undefined : description.trim(),
              due_date: due,
              priority,
            });
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Title
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
              autoFocus
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Due date
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description (optional)
            <textarea
              className="mt-1 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Priority
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>

          <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4 border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
            >
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
