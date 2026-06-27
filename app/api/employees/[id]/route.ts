import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { createServerSupabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  if (payload.role === 'EMPLOYEE' && payload.employee_id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await createServerSupabase()
    .from('employees')
    .select('*, departments(id,name_ar,name_en), positions(id,name_ar,name_en), users(phone,role)')
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
  const body = await request.json();

  const { phone, password, role } = body;
  delete body.user_id;
  delete body.id;
  delete body.password;
  delete body.role;

  const supabase = createServerSupabase();

  const { data: emp } = await supabase.from('employees').select('user_id').eq('id', id).single();

  if (emp?.user_id) {
    const userUpdate: Record<string, string> = {};
    if (phone) userUpdate.phone = phone;
    if (role) userUpdate.role = role;
    if (password) {
      const { hashPassword } = await import('@/lib/auth');
      userUpdate.password_hash = await hashPassword(password);
    }
    if (Object.keys(userUpdate).length > 0) {
      await supabase.from('users').update(userUpdate).eq('id', emp.user_id);
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, departments(name_ar,name_en), positions(name_ar,name_en)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getAuthPayload(request);
  if (!payload || !['SUPER_ADMIN', 'HR_MANAGER'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await createServerSupabase()
    .from('employees')
    .update({ status: 'TERMINATED' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
