import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const employeeId = searchParams.get('employee_id') || '';
  const month = searchParams.get('month') || '';
  const year = searchParams.get('year') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const supabase = createServerSupabase();
  let query = supabase
    .from('attendance')
    .select('*, employees(id,name_ar,name_en,employee_number)', { count: 'exact' });

  if (payload.role === 'EMPLOYEE' && payload.employee_id) {
    query = query.eq('employee_id', payload.employee_id);
  } else if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  if (month && year) {
    const start = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const end = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    query = query.gte('date', start).lte('date', end);
  } else {
    query = query.eq('date', date);
  }

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], count: count || 0 });
}

export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { employee_id, date, check_in, check_out, status, notes } = body;

  if (!employee_id || !date) {
    return NextResponse.json({ error: 'Employee ID and date required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const workHours = (check_in && check_out)
    ? Math.round(((new Date(check_out).getTime() - new Date(check_in).getTime()) / 3600000) * 100) / 100
    : null;

  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      employee_id,
      date,
      check_in,
      check_out,
      status: status || 'PRESENT',
      source: 'manual',
      notes,
      work_hours: workHours,
    }, { onConflict: 'employee_id,date' })
    .select('*, employees(name_ar,name_en)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
