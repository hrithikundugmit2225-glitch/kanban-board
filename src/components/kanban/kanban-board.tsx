'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, DropResult, Draggable, Droppable } from '@hello-pangea/dnd';
import { useBoardStore } from '@/store/use-board-store';
import ColumnContainer from './column-container';
import TaskEditor from './task-editor';
import { Column, Task } from '@/types';
import { useSearchParams } from 'next/navigation';

type Props = {
  boardId: string;
};

type EditorState =
  | { open: false }
  | { open: true; mode: 'create'; column: Column }
  | { open: true; mode: 'edit'; task: Task };

export default function KanbanBoard({ boardId }: Props) {
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

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/boards/${boardId}`, { method: 'GET' });
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
