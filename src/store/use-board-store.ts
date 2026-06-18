import { create } from 'zustand';
import { Column, Task } from '@/types';

type CreateTaskInput = {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Task['priority'];
  column_id: string;
};

type UpdateTaskInput = {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: Task['priority'];
};

function resequenceTasks(tasks: Task[]): Task[] {
  return tasks.map((t, i) => ({
    ...t,
    position: i,
  }));
}

function ensureTaskPositions(columns: Column[]): Column[] {
  return columns.map((c) => ({
    ...c,
    tasks: resequenceTasks(c.tasks),
  }));
}

interface BoardState {
  columns: Column[];
  boardTitle?: string;
  setColumns: (payload: { columns: Column[]; boardTitle?: string }) => void;

  moveTask: (
    taskId: string,
    sourceColId: string,
    destColId: string,
    sourceIndex: number,
    destIndex: number
  ) => void;

  loadBoard: (boardId: string) => Promise<void>;

  createTask: (boardId: string, input: CreateTaskInput) => Promise<void>;
  updateTask: (boardId: string, taskId: string, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (boardId: string, taskId: string) => Promise<void>;

  createColumn: (boardId: string, input: { title: string; position: number }) => Promise<void>;
  reorderColumns: (boardId: string, orderedColumnIds: string[]) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  columns: [],
  boardTitle: undefined,

  setColumns: (payload) => set({ columns: payload.columns, boardTitle: payload.boardTitle }),

  loadBoard: async (boardId) => {
    const res = await fetch(`/api/boards/${boardId}`, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Failed to load board (${res.status})`);
    }
    const data = await res.json();

    const loadedColumns = Array.isArray(data?.columns) ? data.columns : [];
    set({
      columns: loadedColumns,
      boardTitle: data?.board?.title ?? undefined,
    });
  },

  moveTask: (taskId, sourceColId, destColId, sourceIndex, destIndex) =>
    set((state) => {
      const newColumns = [...state.columns];
      const sourceColIndex = newColumns.findIndex((col) => col.id === sourceColId);
      const destColIndex = newColumns.findIndex((col) => col.id === destColId);

      if (sourceColIndex === -1 || destColIndex === -1) return state;

      const sourceCol = newColumns[sourceColIndex];
      const destCol = newColumns[destColIndex];

      const sourceTasks = [...sourceCol.tasks];
      const destTasks = sourceColId === destColId ? sourceTasks : [...destCol.tasks];

      const movedTaskIndex = sourceTasks.findIndex((t) => t.id === taskId);
      const realSourceIndex = movedTaskIndex !== -1 ? movedTaskIndex : sourceIndex;

      const [movedTask] = sourceTasks.splice(realSourceIndex, 1);
      if (!movedTask) return state;

      const nextMovedTask: Task = {
        ...movedTask,
        column_id: destColId,
      };

      destTasks.splice(destIndex, 0, nextMovedTask);

      newColumns[sourceColIndex] = {
        ...sourceCol,
        tasks: sourceTasks,
      };

      if (sourceColId !== destColId) {
        newColumns[destColIndex] = {
          ...destCol,
          tasks: destTasks,
        };
      }

      return { columns: ensureTaskPositions(newColumns) };
    }),

  createTask: async (boardId, input) => {
    const res = await fetch(`/api/boards/${boardId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error('POST /api/boards/:boardId/tasks failed:', res.status, details);
      throw new Error(`Failed to create task (${res.status})`);
    }

    await get().loadBoard(boardId);
  },

  updateTask: async (boardId, taskId, input) => {
    const res = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error(`PATCH /api/boards/${boardId}/tasks/${taskId} failed:`, res.status, details);
      throw new Error(`Failed to update task (${res.status})`);
    }

    await get().loadBoard(boardId);
  },

  deleteTask: async (boardId, taskId) => {
    const res = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error(`DELETE /api/boards/${boardId}/tasks/${taskId} failed:`, res.status, details);
      throw new Error(`Failed to delete task (${res.status})`);
    }

    await get().loadBoard(boardId);
  },

  createColumn: async (boardId, input) => {
    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error(`POST /api/boards/${boardId}/columns failed:`, res.status, details);
      throw new Error(`Failed to create column (${res.status})`);
    }

    await get().loadBoard(boardId);
  },

  reorderColumns: async (boardId, orderedColumnIds) => {
    const res = await fetch(`/api/boards/${boardId}/columns/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedColumnIds }),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => '');
      console.error(`POST /api/boards/${boardId}/columns/reorder failed:`, res.status, details);
      throw new Error(`Failed to reorder columns (${res.status})`);
    }

    await get().loadBoard(boardId);
  },
}));
