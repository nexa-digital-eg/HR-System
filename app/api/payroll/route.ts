import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';
import { calculateNetSalary } from '@/lib/utils';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const month = monthParam ? parseInt(monthParam) : null;
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '30');
  const offset = (page - 1) * limit;

  const supabase = createServerSupabase();
  let query = supabase
    .from('payslips')
    .select('*, employees(id,name_ar,name_en,employee_number)', { count: 'exact' })
    .eq('year', year);

  if (month) query = query.eq('month', month);

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
  if (!payload || !['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { month, year } = await request.json();
  if (!month || !year) return NextResponse.json({ error: 'Month and year required' }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: employees } = await supabase
    .from('employees')
    .select('id, basic_salary, housing_allowance, transport_allowance')
    .eq('status', 'ACTIVE');

  if (!employees?.length) return NextResponse.json({ error: 'No active employees' }, { status: 400 });

  // Pre-fetch all ABSENT attendance for this month in one query
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  const { data: absentRecords } = await supabase
    .from('attendance')
    .select('employee_id')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .eq('status', 'ABSENT');

  // Map employee_id → absent day count
  const absentMap = new Map<string, number>();
  for (const r of (absentRecords || [])) {
    absentMap.set(r.employee_id, (absentMap.get(r.employee_id) || 0) + 1);
  }

  const payslips = [];
  for (const emp of employees) {
    const { data: existing } = await supabase
      .from('payslips')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (existing) continue;

    // Get pending advance deductions
    const { data: advances } = await supabase
      .from('advances')
      .select('installment_amount, remaining_amount')
      .eq('employee_id', emp.id)
      .eq('status', 'APPROVED')
      .gt('remaining_amount', 0);

    const advanceDeduction = advances?.reduce((s, a) => s + Math.min(Number(a.installment_amount) || 0, Number(a.remaining_amount) || 0), 0) || 0;

    const basic = Number(emp.basic_salary) || 0;
    const housing = Number(emp.housing_allowance) || 0;
    const transport = Number(emp.transport_allowance) || 0;

    // Absence deduction: each absent day = 2× daily rate (يوم بيومين)
    const absentDays = absentMap.get(emp.id) || 0;
    const dailyRate = (basic + housing + transport) / 30;
    const absenceDeduction = Math.round(absentDays * dailyRate * 2 * 100) / 100;

    const net = calculateNetSalary({
      basic_salary: basic,
      housing_allowance: housing,
      transport_allowance: transport,
      other_allowances: 0,
      overtime_amount: 0,
      absence_deduction: absenceDeduction,
      late_deduction: 0,
      advance_deduction: advanceDeduction,
      other_deductions: 0,
    });

    payslips.push({
      employee_id: emp.id,
      month,
      year,
      basic_salary: basic,
      housing_allowance: housing,
      transport_allowance: transport,
      other_allowances: 0,
      overtime_amount: 0,
      absence_deduction: absenceDeduction,
      late_deduction: 0,
      advance_deduction: advanceDeduction,
      other_deductions: 0,
      net_salary: net,
      status: 'PENDING',
    });
  }

  if (!payslips.length) {
    return NextResponse.json({ message: 'Payslips already generated for this period', count: 0 });
  }

  const { error } = await supabase.from('payslips').insert(payslips);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, count: payslips.length });
}
