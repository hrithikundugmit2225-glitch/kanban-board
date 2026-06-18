import { getSupabaseServerClient } from '@/lib/supabaseServer';

type CreateBoardPayload = {
  title?: unknown;
};

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id,title,is_starred')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return Response.json({ error: 'Failed to load boards', details: error.message }, { status: 500 });
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
  const supabase = getSupabaseServerClient();

  const body = (await req.json()) as CreateBoardPayload;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  if (!title) return Response.json({ error: 'Board title is required' }, { status: 400 });

  // Create board (allow user_id to be null; RLS/policies must allow anon insert).
  const { data: boardData, error: boardErr } = await supabase
    .from('boards')
    .insert({ title, user_id: null })
    .select('id,title,is_starred')
    .single();

  if (boardErr) {
    return Response.json({ error: 'Failed to create board', details: boardErr.message }, { status: 500 });
  }

  const boardId = (boardData as any).id as string;

  // Create default columns.
  const columnsToInsert = [
    { board_id: boardId, title: 'TO DO', position: 0 },
    { board_id: boardId, title: 'IN PROGRESS', position: 1 },
    { board_id: boardId, title: 'REVIEW', position: 2 },
    { board_id: boardId, title: 'DONE', position: 3 },
  ];

  const { error: colsErr } = await supabase.from('columns').insert(columnsToInsert);
  if (colsErr) {
    return Response.json(
      { error: 'Failed to create default columns', details: colsErr.message },
      { status: 500 }
    );
  }

  return Response.json({
    board: {
      id: boardId,
      title: (boardData as any).title as string,
      is_starred: Boolean((boardData as any).is_starred),
    },
  });
}
