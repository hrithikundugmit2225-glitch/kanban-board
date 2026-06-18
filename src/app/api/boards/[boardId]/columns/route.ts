import { getSupabaseServerClient } from '@/lib/supabaseServer';

type CreateColumnPayload = {
  title?: unknown;
  position?: unknown; // insert index (0..n)
};

function parseTitle(input: unknown) {
  return typeof input === 'string' && input.trim().length > 0 ? input.trim() : 'NEW COLUMN';
}

function parsePosition(input: unknown) {
  if (typeof input !== 'number' || !Number.isFinite(input)) return 0;
  return Math.max(0, Math.floor(input));
}

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  const body = (await req.json()) as CreateColumnPayload;

  const title = parseTitle(body.title);
  const insertPos = parsePosition(body.position);

  const supabase = getSupabaseServerClient();

  // Fetch current columns ordered by position
  const { data: colsData, error: colsErr } = await supabase
    .from('columns')
    .select('id,position')
    .eq('board_id', boardId)
    .order('position', { ascending: true });

  if (colsErr) {
    return Response.json({ error: 'Failed to load columns', details: colsErr.message }, { status: 500 });
  }

  const cols = (colsData ?? []) as any[];
  const safeInsertPos = Math.min(insertPos, cols.length); // insert at end if > length

  // Shift positions for existing columns at/after insert position
  const columnsToShift = cols.filter((c) => typeof c.position === 'number' && c.position >= safeInsertPos);
  for (let i = 0; i < columnsToShift.length; i++) {
    const col = columnsToShift[i];
    const newPos = col.position + 1;

    const { error: shiftErr } = await supabase
      .from('columns')
      .update({ position: newPos })
      .eq('id', col.id);

    if (shiftErr) {
      return Response.json(
        { error: 'Failed to shift column positions', details: shiftErr.message },
        { status: 500 }
      );
    }
  }

  // Create new column at insert position
  const { data: created, error: createErr } = await supabase
    .from('columns')
    .insert({
      board_id: boardId,
      title,
      position: safeInsertPos,
    })
    .select('id,board_id,title,position')
    .single();

  if (createErr) {
    return Response.json({ error: 'Failed to create column', details: createErr.message }, { status: 500 });
  }

  return Response.json({ column: created });
}
