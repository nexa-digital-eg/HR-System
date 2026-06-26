import { NextResponse } from 'next/server';
import { getAuthPayload, comparePassword, hashPassword } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { current_password, new_password } = await request.json();
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', payload.sub)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await comparePassword(current_password, user.password_hash);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  const newHash = await hashPassword(new_password);
  const { error } = await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
