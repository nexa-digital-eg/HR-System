'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminReportsPage() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch(`/api/attendance?month=${month}&year=${year}&limit=1000`).then(r => r.json()),
      fetch(`/api/payroll?month=${month}&year=${year}&limit=200`).then(r => r.json()),
    ]).then(([dashboard, attendance, payroll]) => {
      setStats({ dashboard, attendance, payroll });
      setLoading(false);
    });
  }, [month, year]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const db = stats?.dashboard as Record<string, unknown>;
  const att = stats?.attendance as { data: Array<{ status: string }> };
  const pay = stats?.payroll as { data: Array<{ net_salary: number; basic_salary: number }> };

  const attStatusCounts = ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE'].map(s => ({
    name: t(s.toLowerCase() as Parameters<typeof t>[0]),
    value: (att?.data || []).filter(r => r.status === s).length,
  })).filter(i => i.value > 0);

  const totalNet = (pay?.data || []).reduce((s, p) => s + p.net_salary, 0);
  const totalBasic = (pay?.data || []).reduce((s, p) => s + p.basic_salary, 0);
  const totalDeductions = totalBasic - totalNet;

  const payrollSummary = [
    { name: t('basicSalary'), value: totalBasic },
    { name: t('totalDeductions'), value: totalDeductions },
    { name: t('netSalary'), value: totalNet },
  ];

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
  const formatCurrency = (v: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('reports')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('analyticsAndInsights')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('totalEmployees'), value: (db?.totalEmployees as number) ?? 0, color: 'text-blue-600 bg-blue-50' },
          { label: t('todayPresent'), value: (db?.todayPresent as number) ?? 0, color: 'text-green-600 bg-green-50' },
          { label: t('pendingLeaves'), value: (db?.pendingLeaves as number) ?? 0, color: 'text-amber-600 bg-amber-50' },
          { label: t('pendingAdvances'), value: (db?.pendingAdvances as number) ?? 0, color: 'text-purple-600 bg-purple-50' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className={`text-3xl font-bold ${kpi.color.split(' ')[0]}`}>{kpi.value}</div>
            <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">{t('attendanceDistribution')}</h3>
          {attStatusCounts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">{t('noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attStatusCounts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {attStatusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">{t('payrollBreakdown')} — {monthName(month)} {year}</h3>
          {totalBasic === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">{t('noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payrollSummary} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {payrollSummary.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payroll summary table */}
      {totalBasic > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">{t('payrollSummary')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-slate-500 text-xs mb-1">{t('totalBasicSalaries')}</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(totalBasic)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-slate-500 text-xs mb-1">{t('totalDeductions')}</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-slate-500 text-xs mb-1">{t('totalNetSalaries')}</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalNet)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
