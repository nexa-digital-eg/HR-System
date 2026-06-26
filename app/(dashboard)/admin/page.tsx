'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import {
  Users, Calendar, CreditCard, Clock,
  TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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
  { day: 'Sun', present: 42, absent: 3 },
  { day: 'Mon', present: 45, absent: 2 },
  { day: 'Tue', present: 40, absent: 5 },
  { day: 'Wed', present: 44, absent: 3 },
  { day: 'Thu', present: 43, absent: 4 },
];

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: t('totalEmployees'),
      value: stats?.totalEmployees ?? 0,
      sub: `${stats?.activeEmployees ?? 0} ${t('active')}`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      trend: '+2',
      positive: true,
    },
    {
      title: t('pendingLeaves'),
      value: stats?.pendingLeaves ?? 0,
      sub: t('requiresAction'),
      icon: Calendar,
      color: 'bg-amber-50 text-amber-600',
      trend: null,
      positive: null,
    },
    {
      title: t('pendingAdvances'),
      value: stats?.pendingAdvances ?? 0,
      sub: t('requiresAction'),
      icon: CreditCard,
      color: 'bg-purple-50 text-purple-600',
      trend: null,
      positive: null,
    },
    {
      title: t('todayAttendance'),
      value: stats?.todayPresent ?? 0,
      sub: `${stats?.todayAbsent ?? 0} ${t('absent')}`,
      icon: Clock,
      color: 'bg-green-50 text-green-600',
      trend: null,
      positive: null,
    },
  ];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('dashboard')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon size={22} />
                </div>
                {card.trend && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${card.positive ? 'text-green-600' : 'text-red-500'}`}>
                    {card.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {card.trend}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm font-medium text-slate-600 mt-0.5">{card.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly salary card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
        <p className="text-blue-200 text-sm font-medium">{t('totalMonthlySalary')}</p>
        <p className="text-4xl font-bold mt-2">{formatCurrency(stats?.totalMonthlySalary ?? 0)}</p>
        <p className="text-blue-200 text-sm mt-1">{t('currentMonth')}</p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">{t('weeklyAttendance')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="present" fill="#3b82f6" radius={[6, 6, 0, 0]} name={lang === 'ar' ? 'حضور' : 'Present'} />
              <Bar dataKey="absent" fill="#fca5a5" radius={[6, 6, 0, 0]} name={lang === 'ar' ? 'غياب' : 'Absent'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent leaves */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">{t('recentLeaveRequests')}</h3>
            <a href="/admin/leaves" className="text-xs text-blue-600 font-medium hover:underline">{t('viewAll')}</a>
          </div>
          <div className="space-y-3">
            {(stats?.recentLeaves ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">{t('noData')}</p>
            ) : (
              stats?.recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-xs font-bold">
                      {(lang === 'ar' ? leave.employees.name_ar : leave.employees.name_en)?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {lang === 'ar' ? leave.employees.name_ar : leave.employees.name_en}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {lang === 'ar' ? leave.leave_types.name_ar : leave.leave_types.name_en} · {leave.days} {t('days')}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(leave.status)}`}>
                    {t(leave.status.toLowerCase() as Parameters<typeof t>[0])}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent advances */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{t('recentAdvanceRequests')}</h3>
          <a href="/admin/advances" className="text-xs text-blue-600 font-medium hover:underline">{t('viewAll')}</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-100">
                <th className="pb-2 text-start font-semibold">{t('employee')}</th>
                <th className="pb-2 text-start font-semibold">{t('amount')}</th>
                <th className="pb-2 text-start font-semibold">{t('date')}</th>
                <th className="pb-2 text-start font-semibold">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(stats?.recentAdvances ?? []).length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                stats?.recentAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800">
                      {lang === 'ar' ? adv.employees.name_ar : adv.employees.name_en}
                    </td>
                    <td className="py-2.5 text-slate-600">{formatCurrency(adv.amount)}</td>
                    <td className="py-2.5 text-slate-500">{new Date(adv.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(adv.status)}`}>
                        {t(adv.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
