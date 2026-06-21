import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function requireUserId(req: Request) {
  const supabase = getSupabaseServerClient();
  const accessToken = getBearerToken(req);
  if (!accessToken) return null;

  const { data: userData, error } = await supabase.auth.getUser(accessToken);
  if (error || !userData?.user?.id) return null;

  return userData.user.id;
}

async function requireBoardOwnership(supabase: ReturnType<typeof getSupabaseServerClient>, boardId: string, userId: string) {
  const { data: boardData, error: boardErr } = await supabase
    .from('boards')
    .select('id,title,user_id,is_starred,created_at')
    .eq('id', boardId)
    .eq('user_id', userId)
    .single();

  if (boardErr || !boardData) return null;
  return boardData;
}

export async function GET(req: Request, context: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { boardId } = await context.params;

  const supabase = getSupabaseServerClient();

  const boardData = await requireBoardOwnership(supabase, boardId, userId);
  if (!boardData) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const { data: columnsData, error: colsErr } = await supabase
    .from('columns')
    .select('id,board_id,title,position')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (colsErr) {
    return NextResponse.json(
      { error: 'Failed to load columns', details: colsErr.message },
      { status: 500 },
    );
  }

  const columns = (columnsData ?? []) as any[];
  const columnIds = columns.map((c) => c.id);

  const tasksQuery =
    columnIds.length > 0
      ? supabase
          .from('tasks')
          .select('id,column_id,title,description,due_date,priority,position')
          .in('column_id', columnIds)
          .order('position', { ascending: true })
      : null;

  let tasksData: any[] = [];
  if (tasksQuery) {
    const { data, error: tasksErr } = await tasksQuery;
    if (tasksErr) {
      return NextResponse.json(
        { error: 'Failed to load tasks', details: tasksErr.message },
        { status: 500 },
      );
    }
    tasksData = (data ?? []) as any[];
  }

  const columnsWithTasks = columns.map((col) => ({
    id: col.id,
    board_id: col.board_id,
    title: col.title,
    position: col.position,
    tasks: [] as any[],
  }));

  const colIndexById = new Map(columnsWithTasks.map((c, i) => [c.id, i]));
  for (const task of tasksData) {
    const idx = colIndexById.get(task.column_id);
    if (idx === undefined) continue;
    columnsWithTasks[idx].tasks.push(task);
  }

  columnsWithTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return NextResponse.json({ board: boardData, columns: columnsWithTasks });
}

export async function PATCH(req: Request, context: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { boardId } = await context.params;
  const body = (await req.json()) as { is_starred?: unknown };

  const isStarred = typeof body?.is_starred === 'boolean' ? body.is_starred : undefined;
  if (typeof isStarred !== 'boolean') {
    return NextResponse.json({ error: 'Missing required field: is_starred' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const boardCheck = await requireBoardOwnership(supabase, boardId, userId);
  if (!boardCheck) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const { error } = await supabase
    .from('boards')
    .update({ is_starred: isStarred })
    .eq('id', boardId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update board', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, context: RouteContext) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { boardId } = await context.params;

  const supabase = getSupabaseServerClient();

  const boardCheck = await requireBoardOwnership(supabase, boardId, userId);
  if (!boardCheck) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete board', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
