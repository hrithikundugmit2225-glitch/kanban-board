import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

export async function GET(
  _req: Request,
  context: RouteContext
) {
  const { boardId } = await context.params;
  const supabase = getSupabaseServerClient();

  const { data: boardData, error: boardErr } = await supabase
    .from('boards')
    .select('id,title,user_id,is_starred,created_at')
    .eq('id', boardId)
    .single();

  if (boardErr || !boardData) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const { data: columnsData, error: colsErr } = await supabase
    .from('columns')
    .select('id,board_id,title,position')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (colsErr) {
    return NextResponse.json(
      { error: 'Failed to load columns', details: colsErr.message },
      { status: 500 }
    );
  }

  const columns = (columnsData ?? []) as any[];
  const columnIds = columns.map((c) => c.id);

  const { data: tasksData, error: tasksErr } = await supabase
    .from('tasks')
    .select('id,column_id,title,description,due_date,priority,position')
    .in('column_id', columnIds.length ? columnIds : ['__none__'])
    .order('position', { ascending: true });

  if (tasksErr) {
    return NextResponse.json(
      { error: 'Failed to load tasks', details: tasksErr.message },
      { status: 500 }
    );
  }

  const columnsWithTasks = columns.map((col) => ({
    id: col.id,
    board_id: col.board_id,
    title: col.title,
    position: col.position,
    tasks: [] as any[],
  }));

  const colIndexById = new Map(columnsWithTasks.map((c, i) => [c.id, i]));
  for (const task of (tasksData ?? []) as any[]) {
    const idx = colIndexById.get(task.column_id);
    if (idx === undefined) continue;
    columnsWithTasks[idx].tasks.push(task);
  }

  columnsWithTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return NextResponse.json({ board: boardData, columns: columnsWithTasks });
}

export async function PATCH(
  req: Request,
  context: RouteContext
) {
  const { boardId } = await context.params;
  const body = (await req.json()) as { is_starred?: unknown };

  const isStarred = typeof body?.is_starred === 'boolean' ? body.is_starred : undefined;
  if (typeof isStarred !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing required field: is_starred' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('boards')
    .update({ is_starred: isStarred })
    .eq('id', boardId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update board', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: RouteContext
) {
  const { boardId } = await context.params;
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete board', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}