import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('shifts').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
