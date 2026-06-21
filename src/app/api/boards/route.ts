import { getSupabaseServerClient } from '@/lib/supabaseServer';

type CreateBoardPayload = {
  title?: unknown;
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

export async function GET(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id,title,is_starred')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return Response.json(
      { error: 'Failed to load boards', details: error.message },
      { status: 500 },
    );
  }

  return Response.json({
    boards: (data ?? []).map((r: any) => ({
      id: r.id as string,
      title: r.title as string,
      is_starred: Boolean(r.is_starred),
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const body = (await req.json()) as CreateBoardPayload;

  const titleRaw = typeof body?.title === 'string' ? body.title : '';
  const title = titleRaw.trim();

  if (!title) {
    return Response.json(
      { error: 'Missing required field: title' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('boards')
    .insert({
      title,
      user_id: userId,
      is_starred: false,
    })
    .select('id,title,is_starred')
    .single();

  if (error) {
    return Response.json(
      { error: 'Failed to create board', details: error.message },
      { status: 500 },
    );
  }

  const boardId = data.id as string;

  // Seed default columns for the new board
  const defaultColumns = [
    { title: 'To Do', position: 1 },
    { title: 'In Progress', position: 2 },
    { title: 'Review', position: 3 },
    { title: 'Done', position: 4 },
  ];

  const { data: columnsData, error: colsErr } = await supabase
    .from('columns')
    .insert(
      defaultColumns.map((c) => ({
        board_id: boardId,
        title: c.title,
        position: c.position,
      })),
    )
    .select('id,board_id,title,position')
    .order('position', { ascending: true });

  if (colsErr) {
    return Response.json(
      { error: 'Failed to seed default columns', details: colsErr.message },
      { status: 500 },
    );
  }

  return Response.json({
    board: {
      id: data.id as string,
      title: data.title as string,
      is_starred: Boolean(data.is_starred),
    },
    columns: (columnsData ?? []).map((r: any) => ({
      id: r.id as string,
      board_id: r.board_id as string,
      title: r.title as string,
      position: Number(r.position),
    })),
  });
}
