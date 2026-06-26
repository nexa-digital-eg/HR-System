'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Play, CheckCircle, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

interface Payslip {
  id: string;
  employees: { name_ar: string; name_en: string; employee_number: string };
  month: number;
  year: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  absence_deduction: number;
  late_deduction: number;
  advance_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: string;
  paid_at?: string;
}

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

export default function AdminPayrollPage() {
  const { t, lang } = useLanguage();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [count, setCount] = useState(0);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Payslip | null>(null);

  const fetchPayroll = useCallback(() => {
    setLoading(true);
    fetch(`/api/payroll?month=${month}&year=${year}&limit=100`)
      .then(r => r.json())
      .then(d => { setPayslips(d.data || []); setCount(d.count || 0); setLoading(false); });
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const handleGenerate = async () => {
    if (!confirm(t('confirmGeneratePayroll'))) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${t('generated')} ${data.created} ${t('payslips')}`);
      fetchPayroll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const res = await fetch(`/api/payroll/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    });
    if (res.ok) {
      toast.success(t('markedAsPaid'));
      fetchPayroll();
      setSelected(null);
    } else toast.error(t('error'));
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });

  const totalNet = payslips.reduce((s, p) => s + p.net_salary, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('payroll')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{count} {t('payslips')}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/30 disabled:opacity-60"
        >
          <Play size={15} />
          {generating ? t('generating') : t('generatePayroll')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-700"
        >
          {MONTHS.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-700"
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {count > 0 && (
          <div className="ms-auto bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-sm">
            <span className="text-slate-500">{t('totalNet')}:</span>{' '}
            <span className="font-bold text-blue-700">{formatCurrency(totalNet)}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('basicSalary')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('allowances')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('deductions')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('advanceDeduction')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('netSalary')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <p className="text-slate-400">{t('noPayrollGenerated')}</p>
                    <p className="text-slate-300 text-xs mt-1">{t('clickGenerateToCreate')}</p>
                  </td>
                </tr>
              ) : (
                payslips.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-xs font-bold">
                            {(lang === 'ar' ? p.employees.name_ar : p.employees.name_en)?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? p.employees.name_ar : p.employees.name_en}</p>
                          <p className="text-xs text-slate-400">{p.employees.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-5 py-3.5 text-green-600">{formatCurrency((p.housing_allowance||0) + (p.transport_allowance||0) + (p.other_allowances||0))}</td>
                    <td className="px-5 py-3.5 text-red-500">{formatCurrency((p.absence_deduction||0) + (p.late_deduction||0) + (p.other_deductions||0))}</td>
                    <td className="px-5 py-3.5 text-orange-500">{formatCurrency(p.advance_deduction)}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(p.net_salary)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t(p.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end">
                      <button onClick={() => setSelected(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('payslipDetails')}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-center mb-4">
                <p className="text-slate-500 text-sm">{lang === 'ar' ? selected.employees.name_ar : selected.employees.name_en}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{monthName(selected.month)} {selected.year}</p>
              </div>
              {[
                { label: t('basicSalary'), value: selected.basic_salary, color: '' },
                { label: t('allowances'), value: (selected.housing_allowance||0) + (selected.transport_allowance||0) + (selected.other_allowances||0), color: 'text-green-600' },
                { label: t('deductions'), value: (selected.absence_deduction||0) + (selected.late_deduction||0) + (selected.other_deductions||0), color: 'text-red-500' },
                { label: t('advanceDeduction'), value: selected.advance_deduction || 0, color: 'text-orange-500' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{formatCurrency(Math.abs(row.value))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 bg-blue-50 rounded-xl px-4 mt-4">
                <span className="font-bold text-slate-800">{t('netSalary')}</span>
                <span className="text-xl font-bold text-blue-700">{formatCurrency(selected.net_salary)}</span>
              </div>
            </div>
            {selected.status !== 'PAID' && (
              <div className="p-6 pt-0">
                <button
                  onClick={() => handleMarkPaid(selected.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-sm shadow-green-600/30"
                >
                  <CheckCircle size={16} />
                  {t('markAsPaid')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
