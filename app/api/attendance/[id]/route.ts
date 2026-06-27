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
  const { check_in, check_out, status, notes } = body;

  const workHours = (check_in && check_out)
    ? Math.round(((new Date(check_out).getTime() - new Date(check_in).getTime()) / 3600000) * 100) / 100
    : null;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_in, check_out, status, notes, work_hours: workHours })
    .eq('id', id)
    .select('*, employees(name_ar,name_en,employee_number)')
    .single();

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
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
