'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { User, Phone, Mail, Calendar, Building2, Briefcase, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  employee_number: string;
  name_ar: string;
  name_en: string;
  phone: string;
  email: string;
  hire_date: string;
  basic_salary: number;
  status: string;
  departments: { name_ar: string; name_en: string } | null;
  positions: { name_ar: string; name_en: string } | null;
}

export default function EmployeeProfilePage() {
  const { t, lang } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.employee_id) {
        fetch(`/api/employees/${d.employee_id}`).then(r => r.json()).then(emp => {
          setProfile(emp);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.new) {
      toast.error(t('fillRequired'));
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }
    if (pwForm.new.length < 8) {
      toast.error(t('passwordTooShort'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.new }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('passwordChanged'));
      setShowPwForm(false);
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-12 text-slate-400">{t('noData')}</div>
  );

  const displayName = lang === 'ar' ? profile.name_ar : profile.name_en;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('myProfile')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{profile.employee_number}</p>
      </div>

      {/* Avatar card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-3xl font-bold">{displayName?.charAt(0)}</span>
          </div>
          <div>
            <p className="text-2xl font-bold">{displayName}</p>
            <p className="text-blue-200 text-sm mt-0.5">{profile.positions ? (lang === 'ar' ? profile.positions.name_ar : profile.positions.name_en) : '-'}</p>
            <span className="inline-block mt-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{t(profile.status.toLowerCase() as Parameters<typeof t>[0])}</span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">{t('personalInfo')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: User, label: t('nameAr'), value: profile.name_ar },
            { icon: User, label: t('nameEn'), value: profile.name_en },
            { icon: Phone, label: t('phone'), value: profile.phone },
            { icon: Mail, label: t('email'), value: profile.email || '-' },
            { icon: Calendar, label: t('hireDate'), value: new Date(profile.hire_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB') },
            { icon: Building2, label: t('department'), value: profile.departments ? (lang === 'ar' ? profile.departments.name_ar : profile.departments.name_en) : '-' },
            { icon: Briefcase, label: t('position'), value: profile.positions ? (lang === 'ar' ? profile.positions.name_ar : profile.positions.name_en) : '-' },
            {
              icon: DollarIcon,
              label: t('basicSalary'),
              value: new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(profile.basic_salary),
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{t('security')}</h3>
          <button
            onClick={() => setShowPwForm(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Lock size={14} />
            {t('changePassword')}
          </button>
        </div>

        {showPwForm && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {[
              { key: 'current', label: t('currentPassword'), showKey: 'current' as const },
              { key: 'new', label: t('newPassword'), showKey: 'new' as const },
              { key: 'confirm', label: t('confirmPassword'), showKey: 'new' as const },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input
                    type={showPw[f.showKey] ? 'text' : 'password'}
                    value={pwForm[f.key as keyof typeof pwForm]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 pe-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [f.showKey]: !p[f.showKey] }))}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPw[f.showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setShowPwForm(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleChangePassword} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-600/30">
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DollarIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
