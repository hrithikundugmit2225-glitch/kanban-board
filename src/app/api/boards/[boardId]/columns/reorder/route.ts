import { getSupabaseServerClient } from '@/lib/supabaseServer';

type ReorderPayload = {
  orderedColumnIds?: unknown;
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

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const body = (await req.json()) as ReorderPayload;

  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderedColumnIds = Array.isArray(body?.orderedColumnIds) ? body.orderedColumnIds : [];
  const ids = orderedColumnIds.filter((id) => typeof id === 'string' && id.length > 0) as string[];

  if (!ids.length) {
    return Response.json({ error: 'Missing orderedColumnIds' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Ensure the board belongs to the user (prevents reordering other users' columns)
  const { data: boardRow, error: boardErr } = await supabase
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('user_id', userId)
    .single();

  if (boardErr || !boardRow) {
    return Response.json({ error: 'Board not found' }, { status: 404 });
  }

  // Validate columns belong to that board
  const { data: dbCols, error: colsErr } = await supabase
    .from('columns')
    .select('id')
    .eq('board_id', boardId)
    .in('id', ids);

  if (colsErr) {
    return Response.json(
      { error: 'Failed to validate columns', details: colsErr.message },
      { status: 500 }
    );
  }

  const dbIds = new Set((dbCols ?? []).map((c: any) => c.id as string));
  const filteredIds = ids.filter((id) => dbIds.has(id));

  if (!filteredIds.length) {
    return Response.json({ error: 'No valid columns for this board' }, { status: 400 });
  }

  // Persist new position indexes (only within user's board)
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
