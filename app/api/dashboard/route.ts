import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const today = new Date().toISOString().split('T')[0];
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const [
    { count: totalEmployees },
    { count: activeEmployees },
    { count: pendingLeaves },
    { count: pendingAdvances },
    { count: todayPresent },
    { count: todayAbsent },
    { data: payslips },
    { data: recentLeaves },
    { data: recentAdvances },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('advances').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['PRESENT', 'LATE']),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'ABSENT'),
    supabase.from('payslips').select('net_salary').eq('month', month).eq('year', year),
    supabase.from('leave_requests').select('*, employees(name_ar, name_en), leave_types(name_ar, name_en)').eq('status', 'PENDING').order('created_at', { ascending: false }).limit(5),
    supabase.from('advances').select('*, employees(name_ar, name_en)').eq('status', 'PENDING').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalMonthlySalary = (payslips || []).reduce((s, p) => s + (Number(p.net_salary) || 0), 0);

  return NextResponse.json({
    totalEmployees: totalEmployees || 0,
    activeEmployees: activeEmployees || 0,
    pendingLeaves: pendingLeaves || 0,
    pendingAdvances: pendingAdvances || 0,
    todayPresent: todayPresent || 0,
    todayAbsent: todayAbsent || 0,
    totalMonthlySalary,
    recentLeaves: recentLeaves || [],
    recentAdvances: recentAdvances || [],
  });
}
