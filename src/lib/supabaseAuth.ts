import { getSupabaseClient } from './supabaseClient';

export function getSessionUserOrNull() {
  const supabase = getSupabaseClient();
  return supabase.auth.getSession().then(({ data }) => data.session?.user ?? null);
}
