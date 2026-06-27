import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { amount, reason, installments = 1 } = body;

  if (!amount) return NextResponse.json({ error: 'Amount is required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: advance } = await supabase
    .from('advances')
    .select('id, employee_id, status')
    .eq('id', id)
    .single();

  if (!advance) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (advance.employee_id !== payload.employee_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (advance.status !== 'PENDING') return NextResponse.json({ error: 'لا يمكن تعديل طلب تمت معالجته' }, { status: 400 });

  const installmentCount = Number(installments);
  const installmentAmount = Number(amount) / installmentCount;

  const { data, error } = await supabase
    .from('advances')
    .update({
      amount: Number(amount),
      reason,
      installments: installmentCount,
      installment_amount: installmentAmount,
      remaining_amount: Number(amount),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !payload.employee_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: advance } = await supabase
    .from('advances')
    .select('id, employee_id, status')
    .eq('id', id)
    .single();

  if (!advance) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (advance.employee_id !== payload.employee_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (advance.status !== 'PENDING') return NextResponse.json({ error: 'لا يمكن حذف طلب تمت معالجته' }, { status: 400 });

  const { error } = await supabase.from('advances').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action, rejection_reason } = await request.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: advance } = await supabase
    .from('advances')
    .select('*, employees!employee_id(user_id, name_ar, name_en, manager_id)')
    .eq('id', id)
    .single();

  if (!advance) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const emp = advance.employees as unknown as {
    user_id: string; name_ar: string; name_en: string; manager_id?: string;
  };

  const isDirectManager = !!payload.employee_id && payload.employee_id === emp.manager_id;
  const isHRAdmin = ['HR_MANAGER', 'SUPER_ADMIN', 'FINANCE'].includes(payload.role);

  let newStatus: string;

  if (advance.status === 'PENDING') {
    if (action === 'approve') {
      if (isDirectManager) {
        newStatus = 'MANAGER_APPROVED';
      } else if (isHRAdmin && !emp.manager_id) {
        newStatus = 'APPROVED';
      } else if (isHRAdmin && emp.manager_id) {
        return NextResponse.json({ error: 'يجب موافقة المدير المباشر أولاً' }, { status: 400 });
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      if (!isDirectManager && !isHRAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      newStatus = 'REJECTED';
    }
  } else if (advance.status === 'MANAGER_APPROVED') {
    if (!isHRAdmin) {
      return NextResponse.json({ error: 'يحتاج موافقة الإدارة / الموارد البشرية' }, { status: 403 });
    }
    newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  } else {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

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

  if (emp?.user_id) {
    let titleAr: string, titleEn: string, bodyAr: string, bodyEn: string;
    if (newStatus === 'MANAGER_APPROVED') {
      titleAr = 'وافق مديرك على طلب سلفتك';
      titleEn = 'Manager Approved Your Advance';
      bodyAr = 'وافق مديرك المباشر على طلب سلفتك، في انتظار موافقة الإدارة';
      bodyEn = 'Your direct manager approved your advance request, pending HR final approval';
    } else if (newStatus === 'APPROVED') {
      titleAr = 'تمت الموافقة على طلب سلفتك';
      titleEn = 'Advance Request Approved';
      bodyAr = `تمت الموافقة النهائية على طلب سلفتك بمبلغ ${advance.amount}`;
      bodyEn = `Your advance request for ${advance.amount} has been fully approved`;
    } else {
      titleAr = 'تم رفض طلب سلفتك';
      titleEn = 'Advance Request Rejected';
      bodyAr = `تم رفض طلب سلفتك: ${rejection_reason || ''}`;
      bodyEn = `Your advance request was rejected: ${rejection_reason || ''}`;
    }
    await supabase.from('notifications').insert({
      user_id: emp.user_id,
      title_ar: titleAr,
      title_en: titleEn,
      body_ar: bodyAr,
      body_en: bodyEn,
      type: 'advance_update',
      reference_id: id,
      reference_type: 'advance',
    });
  }

  if (newStatus === 'MANAGER_APPROVED') {
    const { data: hrUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['HR_MANAGER', 'SUPER_ADMIN']);
    if (hrUsers && hrUsers.length > 0) {
      await supabase.from('notifications').insert(
        hrUsers.map((u: { id: string }) => ({
          user_id: u.id,
          title_ar: 'طلب سلفة يحتاج موافقتك',
          title_en: 'Advance Request Awaiting Your Approval',
          body_ar: `وافق المدير على سلفة ${emp.name_ar}، يتطلب موافقتك النهائية`,
          body_en: `Manager approved ${emp.name_en}'s advance, your final approval is needed`,
          type: 'advance_request',
          reference_id: id,
          reference_type: 'advance',
        }))
      );
    }
  }

  return NextResponse.json(data);
}
