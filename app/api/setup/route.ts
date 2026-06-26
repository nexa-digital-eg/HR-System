import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['SUPER_ADMIN', 'HR_MANAGER']);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Admin already exists. Please login via /login', phone: 'existing' },
        { status: 400 }
      );
    }

    const phone = '01000000000';
    const password = 'Admin@123';
    const passwordHash = await hashPassword(password);

    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({ phone, password_hash: passwordHash, role: 'SUPER_ADMIN' })
      .select()
      .single();

    if (uErr) throw uErr;

    const { data: dept } = await supabase.from('departments').select('id').limit(1).single();
    const { data: pos } = await supabase.from('positions').select('id').limit(1).single();

    await supabase.from('employees').insert({
      user_id: user.id,
      employee_number: 'EMP001',
      name_ar: 'مدير النظام',
      name_en: 'System Admin',
      phone,
      department_id: dept?.id,
      position_id: pos?.id,
      hire_date: new Date().toISOString().split('T')[0],
      basic_salary: 0,
      housing_allowance: 0,
      transport_allowance: 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created! Go to /login to sign in.',
      credentials: { phone, password },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Setup failed', details: String(e) }, { status: 500 });
  }
}
