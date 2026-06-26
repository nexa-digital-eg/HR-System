import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';
import { calculateNetSalary } from '@/lib/utils';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createServerSupabase();

  const updateData: Record<string, unknown> = {};

  if (body.status === 'PAID') {
    updateData.status = 'PAID';
    updateData.paid_at = new Date().toISOString();
  } else {
    const { basic_salary, housing_allowance, transport_allowance, other_allowances,
      overtime_amount, absence_deduction, late_deduction, advance_deduction, other_deductions, notes } = body;

    const net = calculateNetSalary({
      basic_salary: basic_salary || 0,
      housing_allowance: housing_allowance || 0,
      transport_allowance: transport_allowance || 0,
      other_allowances: other_allowances || 0,
      overtime_amount: overtime_amount || 0,
      absence_deduction: absence_deduction || 0,
      late_deduction: late_deduction || 0,
      advance_deduction: advance_deduction || 0,
      other_deductions: other_deductions || 0,
    });

    Object.assign(updateData, {
      basic_salary, housing_allowance, transport_allowance, other_allowances,
      overtime_amount, absence_deduction, late_deduction, advance_deduction,
      other_deductions, net_salary: net, notes,
    });
  }

  const { data, error } = await supabase
    .from('payslips')
    .update(updateData)
    .eq('id', id)
    .select('*, employees(name_ar,name_en,employee_number)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
