import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

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

  const { data: advance } = await supabase
    .from('advances')
    .select('*, employees!employee_id(user_id, name_ar, name_en)')
    .eq('id', id)
    .single();

  if (!advance) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (advance.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  const { data, error } = await supabase
    .from('advances')
    .update({
      status: newStatus,
      approved_by: payload.employee_id,
      approved_at: new Date().toISOString(),
      rejection_reason: action === 'reject' ? rejection_reason : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify employee
  if (advance.employees?.user_id) {
    const isApproved = action === 'approve';
    await supabase.from('notifications').insert({
      user_id: advance.employees.user_id,
      title_ar: isApproved ? 'تمت الموافقة على طلب سلفتك' : 'تم رفض طلب سلفتك',
      title_en: isApproved ? 'Advance Request Approved' : 'Advance Request Rejected',
      body_ar: isApproved
        ? `تمت الموافقة على طلب سلفتك بمبلغ ${advance.amount}`
        : `تم رفض طلب سلفتك: ${rejection_reason || ''}`,
      body_en: isApproved
        ? `Your advance request for ${advance.amount} has been approved`
        : `Your advance request was rejected: ${rejection_reason || ''}`,
      type: 'advance_update',
      reference_id: id,
      reference_type: 'advance',
    });
  }

  return NextResponse.json(data);
}
