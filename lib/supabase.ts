import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use service role key on server for full DB access, fall back to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
