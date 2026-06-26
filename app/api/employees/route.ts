import { NextResponse } from 'next/server';
import { getAuthPayload, hashPassword } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';
import { generateEmployeeNumber } from '@/lib/utils';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const department = searchParams.get('department') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createServerSupabase();
  let query = supabase
    .from('employees')
    .select('*, departments(id,name_ar,name_en), positions(id,name_ar,name_en)', { count: 'exact' });

  if (search) {
    query = query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%,employee_number.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (department) query = query.eq('department_id', department);
  if (status) query = query.eq('status', status);

  if (payload.role === 'EMPLOYEE') {
    query = query.eq('user_id', payload.sub);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], count: count || 0, page, limit });
}

export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { phone, password, role = 'EMPLOYEE', ...empData } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const passwordHash = await hashPassword(password);

    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({ phone, password_hash: passwordHash, role })
      .select()
      .single();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    const empNumber = empData.employee_number || generateEmployeeNumber();

    const { data: employee, error: eErr } = await supabase
      .from('employees')
      .insert({
        ...empData,
        user_id: user.id,
        phone,
        employee_number: empNumber,
        housing_allowance: empData.housing_allowance || 0,
        transport_allowance: empData.transport_allowance || 0,
      })
      .select('*, departments(name_ar,name_en), positions(name_ar,name_en)')
      .single();

    if (eErr) {
      await supabase.from('users').delete().eq('id', user.id);
      return NextResponse.json({ error: eErr.message }, { status: 400 });
    }

    // Create initial leave balances for current year
    const { data: leaveTypes } = await supabase.from('leave_types').select('id, days_per_year');
    if (leaveTypes?.length) {
      const currentYear = new Date().getFullYear();
      await supabase.from('leave_balances').insert(
        leaveTypes.map(lt => ({
          employee_id: employee.id,
          leave_type_id: lt.id,
          year: currentYear,
          total_days: lt.days_per_year,
          used_days: 0,
        }))
      );
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
