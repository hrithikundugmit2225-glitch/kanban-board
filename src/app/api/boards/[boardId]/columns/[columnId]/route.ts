import { getSupabaseServerClient } from '@/lib/supabaseServer';

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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ boardId: string; columnId: string }> }
) {
  const { boardId, columnId } = await context.params;

  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  // Ensure board belongs to the user
  const { data: boardRow, error: boardErr } = await supabase
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('user_id', userId)
    .single();

  if (boardErr || !boardRow) {
    return Response.json({ error: 'Board not found' }, { status: 404 });
  }

  // Delete the column only within user's board
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('board_id', boardId)
    .eq('id', columnId);

  if (error) {
    return Response.json({ error: 'Failed to delete column', details: error.message }, { status: 500 });
  }

  // Re-normalize positions to avoid gaps (within user's board)
  const { data: colsData, error: colsErr } = await supabase
    .from('columns')
    .select('id, position')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (colsErr) {
    return Response.json(
      { error: 'Failed to re-sync column positions', details: colsErr.message },
      { status: 500 }
    );
  }

  const cols = (colsData ?? []) as Array<{ id: string; position: number }>;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const { error: updErr } = await supabase
      .from('columns')
      .update({ position: i })
      .eq('id', col.id);

    if (updErr) {
      return Response.json(
        { error: 'Failed to normalize positions', details: updErr.message },
        { status: 500 }
      );
    }
  }

  return Response.json({ ok: true });
}
