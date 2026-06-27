import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

// GET: report of night allowances for a date range
export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Get attendance records with night_allowance > 0 in range
  const { data: records, error } = await supabase
    .from('attendance')
    .select('employee_id, date, night_allowance, employees(id, name_ar, name_en, employee_number)')
    .gte('date', from)
    .lte('date', to)
    .gt('night_allowance', 0)
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get payments already made for this period
  const { data: payments } = await supabase
    .from('night_allowance_payments')
    .select('employee_id, total_amount, paid_at, from_date, to_date')
    .lte('from_date', to)
    .gte('to_date', from);

  // Group by employee
  const empMap = new Map<string, {
    employee_id: string;
    name_ar: string;
    name_en: string;
    employee_number: string;
    days: number;
    total: number;
    paid: number;
  }>();

  for (const rec of records || []) {
    const emp = rec.employees as unknown as { id: string; name_ar: string; name_en: string; employee_number: string } | null;
    if (!emp) continue;
    if (!empMap.has(rec.employee_id)) {
      empMap.set(rec.employee_id, {
        employee_id: rec.employee_id,
        name_ar: emp.name_ar,
        name_en: emp.name_en,
        employee_number: emp.employee_number,
        days: 0,
        total: 0,
        paid: 0,
      });
    }
    const entry = empMap.get(rec.employee_id)!;
    entry.days += 1;
    entry.total += Number(rec.night_allowance);
  }

  // Add paid amounts
  for (const p of payments || []) {
    if (empMap.has(p.employee_id)) {
      empMap.get(p.employee_id)!.paid += Number(p.total_amount);
    }
  }

  const summary = [...empMap.values()].sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  const grandTotal = summary.reduce((s, e) => s + e.total, 0);
  const grandPaid = summary.reduce((s, e) => s + e.paid, 0);

  return NextResponse.json({ data: summary, grandTotal, grandPaid, from, to });
}

// POST: record a payment for a period
export async function POST(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { from, to, employees: empList, notes } = body as {
    from: string;
    to: string;
    employees: { employee_id: string; days_count: number; total_amount: number }[];
    notes?: string;
  };

  if (!from || !to || !empList?.length) {
    return NextResponse.json({ error: 'from, to and employees required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const rows = empList.map(e => ({
    from_date: from,
    to_date: to,
    employee_id: e.employee_id,
    days_count: e.days_count,
    total_amount: e.total_amount,
    notes: notes || null,
  }));

  const { error } = await supabase.from('night_allowance_payments').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, count: rows.length });
}
