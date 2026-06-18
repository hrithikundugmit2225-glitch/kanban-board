import { getSupabaseServerClient } from '@/lib/supabaseServer';

type ReorderPayload = {
  orderedColumnIds?: unknown;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const body = (await req.json()) as ReorderPayload;

  const orderedColumnIds = Array.isArray(body?.orderedColumnIds) ? body.orderedColumnIds : [];
  const ids = orderedColumnIds.filter((id) => typeof id === 'string' && id.length > 0) as string[];

  if (!ids.length) {
    return Response.json({ error: 'Missing orderedColumnIds' }, { status: 400 });
  }

  // Optional: Ensure all ids belong to this board (keeps DB consistent).
  const supabase = getSupabaseServerClient();
  const { data: dbCols, error: colsErr } = await supabase
    .from('columns')
    .select('id')
    .eq('board_id', boardId)
    .in('id', ids);

  if (colsErr) {
    return Response.json({ error: 'Failed to validate columns', details: colsErr.message }, { status: 500 });
  }

  const dbIds = new Set((dbCols ?? []).map((c: any) => c.id as string));
  const filteredIds = ids.filter((id) => dbIds.has(id));

  if (!filteredIds.length) {
    return Response.json({ error: 'No valid columns for this board' }, { status: 400 });
  }

  // Persist new position indexes
  for (let i = 0; i < filteredIds.length; i++) {
    const colId = filteredIds[i];
    const { error: updErr } = await supabase
      .from('columns')
      .update({ position: i })
      .eq('id', colId);

    if (updErr) {
      return Response.json(
        { error: 'Failed to reorder columns', details: updErr.message },
        { status: 500 }
      );
    }
  }

  return Response.json({ ok: true });
}
