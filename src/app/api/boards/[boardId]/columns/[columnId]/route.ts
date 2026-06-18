import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ boardId: string; columnId: string }> }
) {
  const { boardId, columnId } = await context.params;

  const supabase = getSupabaseServerClient();

  // Delete the column. With proper FK constraints / RLS policies,
  // related tasks should cascade or be denied appropriately.
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('board_id', boardId)
    .eq('id', columnId);

  if (error) {
    return Response.json({ error: 'Failed to delete column', details: error.message }, { status: 500 });
  }

  // Re-normalize positions to avoid gaps
  const { data: colsData, error: colsErr } = await supabase
    .from('columns')
    .select('id, position')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (colsErr) {
    return Response.json({ error: 'Failed to re-sync column positions', details: colsErr.message }, { status: 500 });
  }

  const cols = (colsData ?? []) as Array<{ id: string; position: number }>;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const { error: updErr } = await supabase
      .from('columns')
      .update({ position: i })
      .eq('id', col.id);

    if (updErr) {
      return Response.json({ error: 'Failed to normalize positions', details: updErr.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
