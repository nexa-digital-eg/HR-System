'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const ar = lang === 'ar';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) { toast.error(ar ? 'أدخل رقم الهاتف' : 'Enter phone number'); return; }
    if (!password.trim()) { toast.error(ar ? 'أدخل كلمة المرور' : 'Enter password'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || (ar ? 'بيانات غير صحيحة' : 'Invalid credentials')); return; }
      toast.success(ar ? 'أهلاً بك!' : 'Welcome back!');
      router.push(data.role === 'EMPLOYEE' ? '/employee' : '/admin');
      router.refresh();
    } catch {
      toast.error(ar ? 'حدث خطأ' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#080c18' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative p-12"
        style={{ background: 'linear-gradient(160deg, #0d1120 0%, #0a0f1e 60%, #110a0a 100%)' }}>
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -start-20 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(153,27,27,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-1/4 start-1/4 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(185,28,28,0.10) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Top brand */}
        <div className="relative animate-fade-in">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #1c1c1c, #111)', border: '1px solid rgba(153,27,27,0.5)', boxShadow: '0 4px 24px rgba(153,27,27,0.2)' }}>
              <span className="font-black text-3xl leading-none" style={{ fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #c0c0c0 20%, #991B1B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>M</span>
            </div>
            <div>
              <p className="text-xl font-black text-white">{ar ? 'المغربل' : 'El Megharbel'}</p>
              <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Ready Mix</p>
            </div>
          </div>
        </div>

        {/* Center hero text */}
        <div className="relative animate-slide-up">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: 'rgba(153,27,27,0.15)', color: '#f87171', border: '1px solid rgba(153,27,27,0.25)' }}>
              {ar ? 'نظام الموارد البشرية' : 'HR Management System'}
            </div>
            <h1 className="text-4xl font-black leading-tight text-white mb-3">
              {ar ? 'المغربل للمنتجات الاسمنتية' : 'El Megharbel'}
              <br />
              <span style={{ background: 'linear-gradient(135deg, #ef4444, #991B1B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {ar ? 'والخرسانة الجاهزة' : 'Ready Mix Concrete'}
              </span>
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              {ar
                ? 'إدارة احترافية لشؤون الموظفين والرواتب والحضور والانصراف في مكان واحد.'
                : 'Professional HR, payroll & attendance management all in one place.'}
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mt-6">
            {(ar
              ? ['إدارة الموظفين', 'الرواتب', 'الحضور', 'الإجازات', 'السلف']
              : ['Employees', 'Payroll', 'Attendance', 'Leaves', 'Advances']
            ).map((f, i) => (
              <span key={f} className="text-xs px-3 py-1.5 rounded-full font-medium animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)', animationDelay: `${0.3 + i * 0.08}s`, animationFillMode: 'both' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="relative text-xs" style={{ color: '#1e293b' }}>
          © {new Date().getFullYear()} El Megharbel Ready Mix
        </p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative"
        style={{ background: 'linear-gradient(160deg, #080c18 0%, #0a0f1e 100%)' }}>
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(153,27,27,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        {/* Lang toggle */}
        <button
          onClick={() => setLang(ar ? 'en' : 'ar')}
          className="absolute top-5 end-5 text-xs font-bold rounded-xl px-3 py-2 transition-all"
          style={{ color: '#475569', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {ar ? 'English' : 'العربية'}
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8 animate-fade-in">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#111', border: '1px solid rgba(153,27,27,0.5)', boxShadow: '0 2px 14px rgba(153,27,27,0.2)' }}>
            <span className="font-black text-xl" style={{ fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #c0c0c0, #991B1B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>M</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{ar ? 'المغربل' : 'El Megharbel'}</p>
            <p className="text-[11px] font-medium" style={{ color: '#991B1B' }}>Ready Mix</p>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-[380px] relative z-10 animate-scale-in">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            {/* Card header */}
            <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, rgba(153,27,27,0.4) 0%, rgba(185,28,28,0.25) 100%)', borderBottom: '1px solid rgba(153,27,27,0.2)' }}>
              <p className="text-white text-[13px] font-semibold text-center">
                {ar ? 'تسجيل الدخول' : 'Sign In'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold block" style={{ color: '#64748b' }}>
                  {ar ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <div className="relative">
                  <div className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Phone size={15} style={{ color: '#475569' }} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                    autoComplete="tel"
                    className="w-full h-11 rounded-xl text-sm ps-9 pe-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                      outline: 'none',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(185,28,28,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(153,27,27,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold block" style={{ color: '#64748b' }}>
                  {ar ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock size={15} style={{ color: '#475569' }} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-11 rounded-xl text-sm ps-9 pe-10"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0',
                      outline: 'none',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(185,28,28,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(153,27,27,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#475569' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{
                  background: loading ? 'rgba(153,27,27,0.5)' : 'linear-gradient(135deg, #991B1B 0%, #B91C1C 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(153,27,27,0.4)',
                  transition: 'all 0.2s',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {ar ? 'جاري الدخول...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {ar ? 'تسجيل الدخول' : 'Sign In'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] mt-4" style={{ color: '#1e293b' }}>
            © {new Date().getFullYear()} El Megharbel Ready Mix — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
