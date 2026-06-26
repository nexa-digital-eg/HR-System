'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Fingerprint, Phone, Lock, Eye, EyeOff, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) { toast.error(t('phoneRequired')); return; }
    if (!password.trim()) { toast.error(t('passwordRequired')); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t('invalidCredentials')); return; }
      toast.success(lang === 'ar' ? 'أهلاً بك!' : 'Welcome back!');
      router.push(data.role === 'EMPLOYEE' ? '/employee' : '/admin');
      router.refresh();
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d1f3c] to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -end-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -start-40 w-96 h-96 bg-blue-800/10 rounded-full blur-3xl" />
      </div>

      {/* Lang toggle */}
      <button
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="fixed top-5 end-5 z-10 text-xs font-bold text-white/70 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 transition-all border border-white/10 backdrop-blur-sm"
      >
        {lang === 'ar' ? 'English' : 'العربية'}
      </button>

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-600/40">
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Building2 size={14} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">{t('systemName')}</h1>
          <p className="text-slate-400 text-sm">{t('loginSubtitle')}</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-white/5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3">
            <p className="text-white/90 text-sm font-medium text-center">{t('loginTitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 block">{t('phone')}</label>
              <div className="relative">
                <div className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Phone size={17} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  autoComplete="tel"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 block">{t('password')}</label>
              <div className="relative">
                <div className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={17} />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('loading')}
                </>
              ) : (
                <>
                  <Fingerprint size={18} />
                  {t('loginButton')}
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-center text-[11px] text-slate-400">
                {lang === 'ar' ? 'أول مرة؟ افتح ' : 'First time? Open '}
                <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">/api/setup</code>
                {lang === 'ar' ? ' لإنشاء حساب المدير' : ' to create admin account'}
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          © {new Date().getFullYear()} HR Management System
        </p>
      </div>
    </div>
  );
}
