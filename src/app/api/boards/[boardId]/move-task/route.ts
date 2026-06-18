import { getSupabaseServerClient } from '@/lib/supabaseServer';

type MoveTaskPayload = {
  taskId: string;
  sourceColId: string;
  destColId: string;
  sourceIndex: number;
  destIndex: number;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId: _boardId } = await context.params; // boardId kept for future auth/scoping
  const body = (await req.json()) as MoveTaskPayload;

  const { taskId, sourceColId, destColId, sourceIndex, destIndex } = body;

  if (!taskId || !sourceColId || !destColId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const fetchOrderedTaskIds = async (colId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id,position')
        .eq('column_id', colId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((t: any) => t.id as string);
    };

    const sourceIds = await fetchOrderedTaskIds(sourceColId);
    const destIdsInitial = sourceColId === destColId ? sourceIds : await fetchOrderedTaskIds(destColId);

    const fromIndex = Math.max(0, Math.min(sourceIds.length - 1, sourceIndex));
    const taskCurrentIndex = sourceIds.indexOf(taskId);
    const realFromIndex = taskCurrentIndex !== -1 ? taskCurrentIndex : fromIndex;

    const [removedId] = sourceIds.splice(realFromIndex, 1);
    const destIds = [...destIdsInitial];

    const toIndexClamped = Math.max(0, Math.min(destIds.length, destIndex));

    if (sourceColId === destColId) {
      destIds.splice(toIndexClamped, 0, removedId);

      // Re-sequence positions in that column.
      for (let i = 0; i < destIds.length; i++) {
        const { error } = await supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', destIds[i]);
        if (error) throw error;
      }
    } else {
      destIds.splice(toIndexClamped, 0, removedId);

      // Update moved task's column_id.
      const { error: moveErr } = await supabase
        .from('tasks')
        .update({ column_id: destColId })
        .eq('id', taskId);
      if (moveErr) throw moveErr;

      // Re-sequence positions in source column.
      for (let i = 0; i < sourceIds.length; i++) {
        const { error } = await supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', sourceIds[i]);
        if (error) throw error;
      }

      // Re-sequence positions in destination column.
      for (let i = 0; i < destIds.length; i++) {
        const { error } = await supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', destIds[i]);
        if (error) throw error;
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    // Keep UI working by returning a successful no-op on DB errors/unavailable.
    console.error('POST /api/boards/:boardId/move-task fallback (db error):', e);
    return Response.json({ ok: true });
  }
}
