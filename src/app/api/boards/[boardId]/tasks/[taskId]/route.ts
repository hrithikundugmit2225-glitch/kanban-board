import { getSupabaseServerClient } from '@/lib/supabaseServer';

type PatchTaskPayload = {
  title?: unknown;
  description?: unknown;
  due_date?: unknown;
  priority?: unknown;
};

function parsePriority(p: unknown): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (p === 'HIGH' || p === 'MEDIUM' || p === 'LOW') return p;
  return 'LOW';
}

function parseOptionalString(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined;
  const trimmed = s.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseDueDate(d: unknown): string | null {
  if (d === null || d === undefined) return null;
  if (typeof d !== 'string') return null;

  // If client sends date-only (YYYY-MM-DD), keep it exact (no timezone shifting).
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;

  // Fallback for ISO timestamps.
  return date.toISOString().slice(0, 10);
}

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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ boardId: string; taskId: string }> }
) {
  const { boardId, taskId } = await context.params;

  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as PatchTaskPayload;

  const title = parseOptionalString(body.title);
  const description = parseOptionalString(body.description);
  const due_date = body.due_date === undefined ? undefined : parseDueDate(body.due_date);
  const priority = body.priority === undefined ? undefined : parsePriority(body.priority);

  const updatePayload: Record<string, any> = {};
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined) updatePayload.description = description ?? null;
  if (due_date !== undefined) updatePayload.due_date = due_date;
  if (priority !== undefined) updatePayload.priority = priority;

  if (Object.keys(updatePayload).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Ensure board belongs to user
  const { data: boardRow, error: boardErr } = await supabase
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('user_id', userId)
    .single();

  if (boardErr || !boardRow) {
    return Response.json({ error: 'Board not found' }, { status: 404 });
  }

  // Fetch the task (we'll verify its column belongs to the given board)
  const { data: verifyData, error: verifyErr } = await supabase
    .from('tasks')
    .select('id, column_id')
    .eq('id', taskId)
    .single();

  if (verifyErr || !verifyData) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify the task's column belongs to the board
  const { data: colVerify, error: colVerifyErr } = await supabase
    .from('columns')
    .select('id')
    .eq('id', verifyData.column_id)
    .eq('board_id', boardId)
    .single();

  if (colVerifyErr || !colVerify) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (error) {
    return Response.json({ error: 'Failed to update task', details: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ boardId: string; taskId: string }> }
) {
  const { boardId, taskId } = await context.params;

  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const { data: boardRow, error: boardErr } = await supabase
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('user_id', userId)
    .single();

  if (boardErr || !boardRow) {
    return Response.json({ error: 'Board not found' }, { status: 404 });
  }

  // Verify task belongs to a column on this board
  const { data: verifyData, error: verifyErr } = await supabase
    .from('tasks')
    .select('id, column_id')
    .eq('id', taskId)
    .single();

  if (verifyErr || !verifyData) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  const { data: colVerify, error: colVerifyErr } = await supabase
    .from('columns')
    .select('id')
    .eq('id', verifyData.column_id)
    .eq('board_id', boardId)
    .single();

  if (colVerifyErr || !colVerify) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return Response.json({ error: 'Failed to delete task', details: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
