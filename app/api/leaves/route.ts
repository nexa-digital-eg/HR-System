import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');
  const offset = (page - 1) * limit;

  const supabase = createServerSupabase();
  let query = supabase
    .from('leave_requests')
    .select('*, employees!employee_id(id,name_ar,name_en,employee_number,manager_id), leave_types(name_ar,name_en)', { count: 'exact' });

  if (status) query = query.eq('status', status);

  if (payload.role === 'EMPLOYEE' && payload.employee_id) {
    query = query.eq('employee_id', payload.employee_id);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], count: count || 0 });
}

export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { leave_type_id, start_date, end_date, reason } = body;

  if (!leave_type_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const supabase = createServerSupabase();

  // Check leave balance
  const currentYear = new Date().getFullYear();
  const { data: balance } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', payload.employee_id)
    .eq('leave_type_id', leave_type_id)
    .eq('year', currentYear)
    .single();

  if (balance && (balance.total_days - balance.used_days) < days) {
    return NextResponse.json({ error: 'Insufficient leave balance' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: payload.employee_id,
      leave_type_id,
      start_date,
      end_date,
      days,
      reason,
      status: 'PENDING',
    })
    .select('*, leave_types(name_ar,name_en)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify managers
  const { data: employee } = await supabase
    .from('employees')
    .select('name_ar, name_en, manager_id')
    .eq('id', payload.employee_id)
    .single();

  if (employee?.manager_id) {
    const { data: managerEmp } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employee.manager_id)
      .single();

    if (managerEmp?.user_id) {
      await supabase.from('notifications').insert({
        user_id: managerEmp.user_id,
        title_ar: 'طلب إجازة جديد',
        title_en: 'New Leave Request',
        body_ar: `قدّم ${employee.name_ar} طلب إجازة بتاريخ ${start_date}`,
        body_en: `${employee.name_en} submitted a leave request for ${start_date}`,
        type: 'leave_request',
        reference_id: data.id,
        reference_type: 'leave_request',
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
