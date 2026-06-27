import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { comparePassword, createToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone.trim())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('id, name_ar, name_en, positions(name_ar, name_en)')
      .eq('user_id', user.id)
      .single();

    const pos = employee?.positions as unknown as { name_ar: string; name_en: string } | null;

    const token = await createToken({
      sub: user.id,
      role: user.role,
      employee_id: employee?.id,
      name_ar: employee?.name_ar,
      name_en: employee?.name_en,
      phone: user.phone,
      position_name_ar: pos?.name_ar,
      position_name_en: pos?.name_en,
    });

    const res = NextResponse.json({ role: user.role, message: 'Login successful' });
    res.cookies.set('hr_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
