import { getSupabaseServerClient } from '@/lib/supabaseServer';

type CreateTaskPayload = {
  title?: unknown;
  description?: unknown;
  due_date?: unknown;
  priority?: unknown;
  column_id?: unknown;
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

function safeIdString(maybeId: unknown): string {
  return typeof maybeId === 'string' && maybeId.length > 0 ? maybeId : '';
}

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params; // reserved for future auth/scoping

  const supabase = getSupabaseServerClient();
  const body = (await req.json()) as CreateTaskPayload;

  const title = parseOptionalString(body.title) ?? '';
  const description = parseOptionalString(body.description);
  const priority = parsePriority(body.priority);
  const due_date = parseDueDate(body.due_date);
  const column_id = safeIdString(body.column_id);

  if (!title) {
    return Response.json({ error: 'Missing required field: title' }, { status: 400 });
  }
  if (!column_id) {
    return Response.json({ error: 'Missing required field: column_id' }, { status: 400 });
  }

  // Compute next position within the column.
  const { data: lastPosData, error: posErr } = await supabase
    .from('tasks')
    .select('position')
    .eq('column_id', column_id)
    .order('position', { ascending: false })
    .limit(1);

  if (posErr) {
    return Response.json(
      { error: 'Failed to compute task position', details: posErr.message },
      { status: 500 }
    );
  }

  const lastPos = (lastPosData?.[0] as any)?.position;
  const nextPosition = (typeof lastPos === 'number' ? lastPos : -1) + 1;

  const { data: taskData, error: taskErr } = await supabase
    .from('tasks')
    .insert({
      column_id,
      title,
      description: description ?? null,
      due_date: due_date ?? null,
      priority,
      position: nextPosition,
    })
    .select('id,column_id,title,description,due_date,priority,position')
    .single();

  if (taskErr) {
    return Response.json({ error: 'Failed to create task', details: taskErr.message }, { status: 500 });
  }

  return Response.json({ task: taskData });
}
