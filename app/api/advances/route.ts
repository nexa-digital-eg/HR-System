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
    .from('advances')
    .select('*, employees(id,name_ar,name_en,employee_number)', { count: 'exact' });

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
  const { amount, reason, installments = 1 } = body;

  if (!amount) {
    return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const installmentAmount = Number(amount) / Number(installments);

  const { data, error } = await supabase
    .from('advances')
    .insert({
      employee_id: payload.employee_id,
      amount: Number(amount),
      reason,
      installments: Number(installments),
      installment_amount: installmentAmount,
      remaining_amount: Number(amount),
      paid_amount: 0,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify manager
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
        title_ar: 'طلب سلفة جديد',
        title_en: 'New Advance Request',
        body_ar: `قدّم ${employee.name_ar} طلب سلفة بمبلغ ${amount}`,
        body_en: `${employee.name_en} submitted an advance request for ${amount}`,
        type: 'advance_request',
        reference_id: data.id,
        reference_type: 'advance',
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
