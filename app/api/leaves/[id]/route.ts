import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await createServerSupabase()
    .from('leave_requests')
    .select('*, employees(name_ar,name_en,employee_number), leave_types(name_ar,name_en)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || payload.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action, rejection_reason } = await request.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('*, employees(user_id, name_ar, name_en)')
    .eq('id', id)
    .single();

  if (!leave) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (leave.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const approverEmpId = payload.employee_id;

  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status: newStatus,
      approved_by: approverEmpId,
      approved_at: new Date().toISOString(),
      rejection_reason: action === 'reject' ? rejection_reason : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update leave balance if approved
  if (action === 'approve') {
    const currentYear = new Date().getFullYear();
    const { data: bal } = await supabase
      .from('leave_balances')
      .select('id, used_days')
      .eq('employee_id', leave.employee_id)
      .eq('leave_type_id', leave.leave_type_id)
      .eq('year', currentYear)
      .single();
    if (bal) {
      await supabase.from('leave_balances')
        .update({ used_days: bal.used_days + leave.days })
        .eq('id', bal.id);
    }
  }

  // Notify employee
  if (leave.employees?.user_id) {
    const isApproved = action === 'approve';
    await supabase.from('notifications').insert({
      user_id: leave.employees.user_id,
      title_ar: isApproved ? 'تمت الموافقة على إجازتك' : 'تم رفض طلب إجازتك',
      title_en: isApproved ? 'Leave Request Approved' : 'Leave Request Rejected',
      body_ar: isApproved ? 'تمت الموافقة على طلب إجازتك بنجاح' : `تم رفض طلب إجازتك: ${rejection_reason || ''}`,
      body_en: isApproved ? 'Your leave request has been approved' : `Your leave request was rejected: ${rejection_reason || ''}`,
      type: 'leave_update',
      reference_id: id,
      reference_type: 'leave_request',
    });
  }

  return NextResponse.json(data);
}
