'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import {
  Users, Calendar, CreditCard, Clock, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  pendingAdvances: number;
  todayPresent: number;
  todayAbsent: number;
  totalMonthlySalary: number;
  recentLeaves: Array<{ id: string; employees: { name_ar: string; name_en: string }; leave_types: { name_ar: string; name_en: string }; days: number; status: string; start_date: string }>;
  recentAdvances: Array<{ id: string; employees: { name_ar: string; name_en: string }; amount: number; status: string; created_at: string }>;
}

const attendanceData = [
  { day: 'الأحد',   present: 42, absent: 3 },
  { day: 'الاثنين', present: 45, absent: 2 },
  { day: 'الثلاثاء', present: 40, absent: 5 },
  { day: 'الأربعاء', present: 44, absent: 3 },
  { day: 'الخميس',  present: 43, absent: 4 },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="skeleton h-10 w-10 rounded-xl mb-4" />
      <div className="skeleton h-8 w-16 mb-2" />
      <div className="skeleton h-4 w-28 mb-1" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const ar = lang === 'ar';

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(ar ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const getStatusStyle = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      PENDING:  { bg: 'rgba(245,158,11,0.12)',  color: '#D97706' },
      APPROVED: { bg: 'rgba(5,150,105,0.12)',   color: '#059669' },
      REJECTED: { bg: 'rgba(185,28,28,0.12)',   color: '#B91C1C' },
    };
    return map[status] || { bg: 'rgba(100,116,139,0.12)', color: '#64748b' };
  };

  const statCards = [
    { title: t('totalEmployees'),  value: stats?.totalEmployees ?? 0,  sub: `${stats?.activeEmployees ?? 0} ${t('active')}`,       icon: Users,    gradient: ['#1e3a5f', '#1e293b'], iconColor: '#60a5fa' },
    { title: t('pendingLeaves'),   value: stats?.pendingLeaves ?? 0,   sub: t('requiresAction'),                                    icon: Calendar, gradient: ['#3d2900', '#2d1f00'], iconColor: '#fbbf24' },
    { title: t('pendingAdvances'), value: stats?.pendingAdvances ?? 0, sub: t('requiresAction'),                                    icon: CreditCard, gradient: ['#2d0a2e', '#1f0a20'], iconColor: '#c084fc' },
    { title: t('todayAttendance'), value: stats?.todayPresent ?? 0,    sub: `${stats?.todayAbsent ?? 0} ${t('absent')}`,           icon: Clock,    gradient: ['#0a2d1e', '#061a11'], iconColor: '#34d399' },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('dashboard')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {ar ? 'مباشر' : 'Live'}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={card.title}
                  className={`stat-card animate-slide-up stagger-${i + 1}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})` }}>
                      <Icon size={18} style={{ color: card.iconColor }} />
                    </div>
                    <TrendingUp size={14} style={{ color: '#94a3b8' }} />
                  </div>
                  <p className="text-[28px] font-black text-slate-900 leading-tight">{card.value}</p>
                  <p className="text-[13px] font-semibold text-slate-700 mt-1">{card.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                </div>
              );
            })}
      </div>

      {/* Salary banner */}
      <div className="rounded-2xl p-6 relative overflow-hidden animate-slide-up stagger-5"
        style={{ background: 'linear-gradient(135deg, #1a0505 0%, #2d0a0a 40%, #3d0f0f 100%)', border: '1px solid rgba(153,27,27,0.25)' }}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(185,28,28,0.15) 0%, transparent 70%)' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative">
          <p className="text-[13px] font-semibold mb-1" style={{ color: 'rgba(252,165,165,0.7)' }}>{t('totalMonthlySalary')}</p>
          <p className="text-4xl font-black text-white">{formatCurrency(stats?.totalMonthlySalary ?? 0)}</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(252,165,165,0.5)' }}>{t('currentMonth')}</p>
        </div>
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm animate-slide-up stagger-6">
          <h3 className="font-bold text-slate-800 text-[14px] mb-4">{t('weeklyAttendance')}</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={attendanceData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                cursor={{ fill: 'rgba(153,27,27,0.04)' }}
              />
              <Bar dataKey="present" fill="#991B1B" radius={[6, 6, 0, 0]} name={ar ? 'حضور' : 'Present'} />
              <Bar dataKey="absent"  fill="#fca5a5" radius={[6, 6, 0, 0]} name={ar ? 'غياب' : 'Absent'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent leaves */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm animate-slide-up stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-[14px]">{t('recentLeaveRequests')}</h3>
            <a href="/admin/leaves" className="text-xs font-semibold hover:underline" style={{ color: '#991B1B' }}>{t('viewAll')}</a>
          </div>
          <div className="space-y-2">
            {(stats?.recentLeaves ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">{t('noData')}</p>
            ) : (
              stats?.recentLeaves.map((leave) => {
                const s = getStatusStyle(leave.status);
                return (
                  <div key={leave.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #991B1B, #B91C1C)' }}>
                      {(ar ? leave.employees.name_ar : leave.employees.name_en)?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">
                        {ar ? leave.employees.name_ar : leave.employees.name_en}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {ar ? leave.leave_types.name_ar : leave.leave_types.name_en} · {leave.days} {t('days')}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: s.bg, color: s.color }}>
                      {t(leave.status.toLowerCase() as Parameters<typeof t>[0])}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent advances */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-[14px]">{t('recentAdvanceRequests')}</h3>
          <a href="/admin/advances" className="text-xs font-semibold hover:underline" style={{ color: '#991B1B' }}>{t('viewAll')}</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th className="pb-3 text-start text-[11px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{t('employee')}</th>
                <th className="pb-3 text-start text-[11px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{t('amount')}</th>
                <th className="pb-3 text-start text-[11px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{t('date')}</th>
                <th className="pb-3 text-start text-[11px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentAdvances ?? []).length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">{t('noData')}</td></tr>
              ) : (
                stats?.recentAdvances.map((adv) => {
                  const s = getStatusStyle(adv.status);
                  return (
                    <tr key={adv.id} className="transition-colors hover:bg-slate-50/70" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td className="py-3 font-semibold text-slate-800 text-[13px]">
                        {ar ? adv.employees.name_ar : adv.employees.name_en}
                      </td>
                      <td className="py-3 font-semibold text-[13px]" style={{ color: '#991B1B' }}>{formatCurrency(adv.amount)}</td>
                      <td className="py-3 text-slate-400 text-[12px]">{new Date(adv.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-GB')}</td>
                      <td className="py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                          {t(adv.status.toLowerCase() as Parameters<typeof t>[0])}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
