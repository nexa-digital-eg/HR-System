'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { DollarSign, Eye, X } from 'lucide-react';

interface Payslip {
  id: string;
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

export default function EmployeePayrollPage() {
  const { t, lang } = useLanguage();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payslip | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/payroll?year=${year}&limit=12`)
      .then(r => r.json())
      .then(d => { setPayslips(d.data || []); setLoading(false); });
  }, [year]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);

  const monthName = (m: number) => new Date(2024, m - 1, 1).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('myPayslips')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{payslips.length} {t('records')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-600">{t('year')}:</label>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Payslip cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm text-center">
          <DollarSign size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">{t('noPayslips')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelected(p)}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900">{monthName(p.month)}</p>
                  <p className="text-sm text-slate-400">{p.year}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {t(p.status.toLowerCase() as Parameters<typeof t>[0])}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(p.net_salary)}</p>
              <p className="text-xs text-slate-400 mt-1">{t('netSalary')}</p>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">{t('basicSalary')}</p>
                  <p className="font-semibold text-slate-700">{formatCurrency(p.basic_salary)}</p>
                </div>
                <div>
                  <p className="text-slate-400">{t('deductions')}</p>
                  <p className="font-semibold text-red-500">{formatCurrency((p.absence_deduction||0) + (p.late_deduction||0) + (p.other_deductions||0) + (p.advance_deduction||0))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payslip modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('payslipDetails')}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{monthName(selected.month)} {selected.year}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: t('basicSalary'), value: selected.basic_salary, cls: '' },
                { label: t('allowances'), value: (selected.housing_allowance||0) + (selected.transport_allowance||0) + (selected.other_allowances||0), cls: 'text-green-600' },
                { label: t('deductions'), value: (selected.absence_deduction||0) + (selected.late_deduction||0) + (selected.other_deductions||0), cls: 'text-red-500', neg: true },
                { label: t('advanceDeduction'), value: selected.advance_deduction || 0, cls: 'text-orange-500', neg: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.cls}`}>
                    {row.neg ? '- ' : '+ '}{formatCurrency(row.value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 bg-blue-50 rounded-xl px-4 mt-2">
                <span className="font-bold text-slate-800">{t('netSalary')}</span>
                <span className="text-2xl font-bold text-blue-700">{formatCurrency(selected.net_salary)}</span>
              </div>
              {selected.paid_at && (
                <p className="text-xs text-slate-400 text-center">
                  {t('paidOn')} {new Date(selected.paid_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
