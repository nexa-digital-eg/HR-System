'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Calendar, CreditCard, Clock, DollarSign, AlertCircle } from 'lucide-react';

interface MyData {
  latestPayslip: { net_salary: number; month: number; year: number; status: string } | null;
  leaveBalances: Array<{ leave_types: { name_ar: string; name_en: string }; total_days: number; used_days: number }>;
  pendingLeaves: number;
  pendingAdvances: number;
  todayAttendance: { check_in: string | null; check_out: string | null; status: string } | null;
}

export default function EmployeeDashboard() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      fetch(`/api/payroll?month=${month}&year=${year}&limit=1`).then(r => r.json()),
      fetch('/api/leaves/balances').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/leaves?status=PENDING&limit=1').then(r => r.json()),
      fetch('/api/advances?status=PENDING&limit=1').then(r => r.json()),
      fetch(`/api/attendance?date=${today}&limit=1`).then(r => r.json()),
    ]).then(([payroll, balances, leaves, advances, att]) => {
      setData({
        latestPayslip: payroll.data?.[0] || null,
        leaveBalances: balances.data || [],
        pendingLeaves: leaves.count || 0,
        pendingAdvances: advances.count || 0,
        todayAttendance: att.data?.[0] || null,
      });
      setLoading(false);
    });
  }, []);

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusColor = (s: string) => ({
    PRESENT: 'text-green-600 bg-green-50',
    LATE: 'text-amber-600 bg-amber-50',
    ABSENT: 'text-red-600 bg-red-50',
  }[s] || 'text-slate-600 bg-slate-50');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('myDashboard')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Today attendance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Clock size={20} className="text-teal-600" />
            </div>
            {data?.todayAttendance && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(data.todayAttendance.status)}`}>
                {t(data.todayAttendance.status.toLowerCase() as Parameters<typeof t>[0])}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-600">{t('todayAttendance')}</p>
          {data?.todayAttendance ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-700">{t('in')}: <span className="font-bold font-mono">{formatTime(data.todayAttendance.check_in)}</span></p>
              <p className="text-sm text-slate-700">{t('out')}: <span className="font-bold font-mono">{formatTime(data.todayAttendance.check_out)}</span></p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 mt-2">{t('notRecordedYet')}</p>
          )}
        </div>

        {/* Latest payslip */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-green-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">{t('latestSalary')}</p>
          {data?.latestPayslip ? (
            <>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.latestPayslip.net_salary)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{monthName(data.latestPayslip.month)} {data.latestPayslip.year}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">{t('noData')}</p>
          )}
        </div>

        {/* Pending leaves */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Calendar size={20} className="text-amber-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">{t('pendingLeaves')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data?.pendingLeaves ?? 0}</p>
          <a href="/employee/leaves" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">{t('viewAll')}</a>
        </div>

        {/* Pending advances */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <CreditCard size={20} className="text-purple-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">{t('pendingAdvances')}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data?.pendingAdvances ?? 0}</p>
          <a href="/employee/advances" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">{t('viewAll')}</a>
        </div>
      </div>

      {/* Leave balances */}
      {(data?.leaveBalances?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">{t('leaveBalances')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.leaveBalances.map((bal, i) => {
              const remaining = bal.total_days - bal.used_days;
              const pct = Math.min(100, (bal.used_days / bal.total_days) * 100) || 0;
              return (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">
                      {lang === 'ar' ? bal.leave_types.name_ar : bal.leave_types.name_en}
                    </p>
                    <span className="text-xs font-bold text-blue-600">{remaining} {t('remaining')}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{bal.used_days} / {bal.total_days} {t('days')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/employee/leaves" className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0">
            <Calendar size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{t('requestLeave')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('submitLeaveRequest')}</p>
          </div>
        </a>
        <a href="/employee/advances" className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors shrink-0">
            <CreditCard size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{t('requestAdvance')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('submitAdvanceRequest')}</p>
          </div>
        </a>
      </div>
    </div>
  );
}
