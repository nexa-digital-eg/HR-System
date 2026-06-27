'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Search, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Department { id: string; name_ar: string; name_en: string; }
interface Position { id: string; name_ar: string; name_en: string; }
interface Employee {
  id: string;
  employee_number: string;
  name_ar: string;
  name_en: string;
  phone: string;
  email: string;
  hire_date: string;
  basic_salary: number;
  status: string;
  bank_account_number: string | null;
  shift_id: string | null;
  role: string;
  departments: { id: string; name_ar: string; name_en: string } | null;
  positions: { id: string; name_ar: string; name_en: string } | null;
}

interface Shift { id: string; name_ar: string; name_en: string; }

const BLANK_FORM = {
  name_ar: '', name_en: '', phone: '', email: '', password: '',
  employee_number: '', hire_date: '', basic_salary: '',
  department_id: '', position_id: '', shift_id: '', role: 'EMPLOYEE', status: 'ACTIVE',
  bank_account_number: '',
};

export default function EmployeesPage() {
  const { t, lang } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState(10);
  const [showPassword, setShowPassword] = useState(false);

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (deptFilter) params.set('department', deptFilter);
    fetch(`/api/employees?${params}`)
      .then(r => r.json())
      .then(d => { setEmployees(d.data || []); setCount(d.count || 0); setLoading(false); });
  }, [page, search, deptFilter, limit]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.data || d || []));
    fetch('/api/positions').then(r => r.json()).then(d => setPositions(d.data || d || []));
    fetch('/api/shifts').then(r => r.json()).then(d => setShifts(d || []));
  }, []);

  const openAdd = () => { setEditId(null); setForm({ ...BLANK_FORM }); setShowModal(true); };
  const openEdit = (emp: Employee) => {
    setEditId(emp.id);
    setForm({
      name_ar: emp.name_ar, name_en: emp.name_en, phone: emp.phone,
      email: emp.email || '', password: '', employee_number: emp.employee_number,
      hire_date: emp.hire_date, basic_salary: String(emp.basic_salary),
      department_id: emp.departments?.id || '', position_id: emp.positions?.id || '', shift_id: emp.shift_id || '', role: emp.role || 'EMPLOYEE', status: emp.status,
      bank_account_number: emp.bank_account_number || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editId ? `/api/employees/${editId}` : '/api/employees';
      const method = editId ? 'PUT' : 'POST';
      const body: Record<string, unknown> = { ...form, basic_salary: Number(form.basic_salary) };
      if (editId && !form.password) delete body.password;
      // Convert empty UUID strings to null so Postgres doesn't reject them
      for (const key of ['department_id', 'position_id', 'shift_id'] as const) {
        if (!body[key]) body[key] = null;
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(editId ? t('updated') : t('created'));
      setShowModal(false);
      fetchEmployees();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t('confirmDelete')} "${name}"?`)) return;
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('deleted')); fetchEmployees(); }
    else toast.error(t('error'));
  };

  const totalPages = Math.ceil(count / limit);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-slate-100 text-slate-600', TERMINATED: 'bg-red-100 text-red-600' };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('employees')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{count} {t('total')}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm" style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.35)' }}>
          <Plus size={16} />
          {t('addEmployee')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('search')}
            className="w-full ps-9 pe-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 text-slate-700"
        >
          <option value="">{t('allDepartments')}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
        </select>
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 text-slate-700"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>{lang === 'ar' ? 'عرض الكل' : 'Show All'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('employee')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('department')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('phone')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{lang === 'ar' ? 'رقم الحساب البنكي' : 'Bank Account'}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('basicSalary')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('hireDate')}</th>
                <th className="text-start px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('status')}</th>
                <th className="text-end px-5 py-3.5 font-semibold text-slate-600 text-xs">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="w-6 h-6 border-2 border-red-800 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">{t('noData')}</td></tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)' }}>
                          <span className="text-white text-xs font-bold">{(lang === 'ar' ? emp.name_ar : emp.name_en)?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{lang === 'ar' ? emp.name_ar : emp.name_en}</p>
                          <p className="text-xs text-slate-400">{emp.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{emp.departments ? (lang === 'ar' ? emp.departments.name_ar : emp.departments.name_en) : '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{emp.phone}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{emp.bank_account_number || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-semibold">{Number(emp.basic_salary).toLocaleString()} EGP</td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(emp.hire_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(emp.status)}`}>
                        {t(emp.status.toLowerCase() as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-700 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(emp.id, lang === 'ar' ? emp.name_ar : emp.name_en)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">{t('showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, count)} {t('of')} {count}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-medium text-slate-700 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-slate-900">{editId ? t('editEmployee') : t('addEmployee')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'name_ar', label: t('nameAr'), type: 'text', required: true },
                  { key: 'name_en', label: t('nameEn'), type: 'text' },
                  { key: 'phone', label: t('phone'), type: 'tel', required: true },
                  { key: 'email', label: t('email'), type: 'email' },
                  { key: 'employee_number', label: t('employeeNumber'), type: 'text', required: true },
                  { key: 'hire_date', label: t('hireDate'), type: 'date', required: true },
                  { key: 'basic_salary', label: t('basicSalary'), type: 'number', required: true },
                  { key: 'bank_account_number', label: lang === 'ar' ? 'رقم الحساب البنكي' : 'Bank Account Number', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {f.label}{f.required && <span className="text-red-600 ms-0.5">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                    />
                  </div>
                ))}
                {/* Password with show/hide toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {editId ? t('newPassword') : t('password')}
                    {!editId && <span className="text-red-600 ms-0.5">*</span>}
                    {editId && <span className="text-slate-400 font-normal ms-1">({lang === 'ar' ? 'اتركه فارغاً للإبقاء على القديم' : 'leave blank to keep current'})</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full px-3 py-2.5 pe-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('department')}</label>
                  <select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800">
                    <option value="">{t('selectDepartment')}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('position')}</label>
                  <select value={form.position_id} onChange={e => setForm(p => ({ ...p, position_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800">
                    <option value="">{t('selectPosition')}</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{lang === 'ar' ? p.name_ar : p.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{lang === 'ar' ? 'الوردية' : 'Shift'}</label>
                  <select value={form.shift_id} onChange={e => setForm(p => ({ ...p, shift_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800">
                    <option value="">{lang === 'ar' ? 'بدون وردية' : 'No shift'}</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('role')}</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800">
                    {['EMPLOYEE', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'FINANCE', 'SUPER_ADMIN'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('status')}</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800">
                    {['ACTIVE', 'INACTIVE', 'TERMINATED'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                {t('cancel')}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#991B1B,#B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.35)' }}>
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
