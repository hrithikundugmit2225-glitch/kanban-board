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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ boardId: string; taskId: string }> }
) {
  const { taskId } = await context.params; // boardId reserved for future auth/scoping
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
  const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);

  if (error) {
    return Response.json({ error: 'Failed to update task', details: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ boardId: string; taskId: string }> }
) {
  const { taskId } = await context.params; // boardId reserved for future auth/scoping

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    return Response.json({ error: 'Failed to delete task', details: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
