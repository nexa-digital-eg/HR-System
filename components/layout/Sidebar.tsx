'use client';

import { useLanguage } from '@/lib/i18n';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, DollarSign, Calendar, CreditCard,
  Clock, BarChart2, LogOut, UserCircle, Fingerprint, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JWTPayload } from '@/lib/types';

interface SidebarProps {
  user: JWTPayload;
}

const adminLinks = [
  { href: '/admin', icon: LayoutDashboard, key: 'dashboard', section: 'main' },
  { href: '/admin/employees', icon: Users, key: 'employees', section: 'main' },
  { href: '/admin/payroll', icon: DollarSign, key: 'payroll', section: 'main' },
  { href: '/admin/leaves', icon: Calendar, key: 'leaves', section: 'requests' },
  { href: '/admin/advances', icon: CreditCard, key: 'advances', section: 'requests' },
  { href: '/admin/attendance', icon: Clock, key: 'attendance', section: 'operations' },
  { href: '/admin/shifts', icon: Fingerprint, key: 'shifts', section: 'operations' },
  { href: '/admin/reports', icon: BarChart2, key: 'reports', section: 'operations' },
];

const employeeLinks = [
  { href: '/employee', icon: LayoutDashboard, key: 'dashboard', section: 'main' },
  { href: '/employee/payroll', icon: DollarSign, key: 'myPayslips', section: 'main' },
  { href: '/employee/leaves', icon: Calendar, key: 'myLeaves', section: 'requests' },
  { href: '/employee/advances', icon: CreditCard, key: 'myAdvances', section: 'requests' },
  { href: '/employee/attendance', icon: Clock, key: 'myAttendance', section: 'operations' },
  { href: '/employee/profile', icon: UserCircle, key: 'myProfile', section: 'operations' },
];

const sectionKeys: Record<string, 'mainMenu' | 'requests' | 'operations'> = {
  main: 'mainMenu',
  requests: 'requests',
  operations: 'operations',
};

export default function Sidebar({ user }: SidebarProps) {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user.role !== 'EMPLOYEE';
  const links = isAdmin ? adminLinks : employeeLinks;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/employee') return pathname === href;
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const displayName = lang === 'ar' ? user.name_ar : user.name_en;
  const sections = ['main', 'requests', 'operations'];

  return (
    <aside className="fixed inset-y-0 start-0 z-50 w-64 bg-[#0f172a] flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Fingerprint className="w-4.5 h-4.5 text-white" size={18} />
          </div>
          <div>
            <p className="text-white text-sm font-bold">HR System</p>
            <p className="text-slate-500 text-[10px] leading-none">v1.0</p>
          </div>
        </div>
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="text-[11px] font-bold text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-lg px-2 py-1 transition-all border border-white/[0.06]"
        >
          {lang === 'ar' ? 'EN' : 'عر'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((section) => {
          const sectionLinks = links.filter(l => l.section === section);
          if (!sectionLinks.length) return null;
          return (
            <div key={section}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {t(sectionKeys[section])}
              </p>
              <div className="space-y-0.5">
                {sectionLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <button
                      key={link.href}
                      onClick={() => router.push(link.href)}
                      className={cn(
                        'sidebar-item w-full group',
                        active && 'active'
                      )}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="flex-1 text-start text-[13px]">
                        {t(link.key as Parameters<typeof t>[0])}
                      </span>
                      {active && <ChevronRight size={14} className="text-blue-400 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-3 space-y-1 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
            <span className="text-blue-400 font-bold text-xs">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate leading-tight">{displayName}</p>
            <p className="text-slate-500 text-[11px] truncate">{user.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 !text-red-400"
        >
          <LogOut size={17} />
          <span className="text-[13px]">{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
