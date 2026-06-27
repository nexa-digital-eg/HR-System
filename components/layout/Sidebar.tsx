'use client';

import { useLanguage } from '@/lib/i18n';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, DollarSign, Calendar, CreditCard,
  Clock, BarChart2, LogOut, UserCircle, Fingerprint, ChevronRight, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JWTPayload } from '@/lib/types';

interface SidebarProps { user: JWTPayload; }

const adminLinks = [
  { href: '/admin',                  icon: LayoutDashboard, key: 'dashboard',      section: 'main' },
  { href: '/admin/employees',        icon: Users,           key: 'employees',      section: 'main' },
  { href: '/admin/payroll',          icon: DollarSign,      key: 'payroll',        section: 'main' },
  { href: '/admin/leaves',           icon: Calendar,        key: 'leaves',         section: 'requests' },
  { href: '/admin/advances',         icon: CreditCard,      key: 'advances',       section: 'requests' },
  { href: '/admin/attendance',       icon: Clock,           key: 'attendance',     section: 'operations' },
  { href: '/admin/shifts',           icon: Fingerprint,     key: 'shifts',         section: 'operations' },
  { href: '/admin/night-allowances', icon: Clock,           key: 'nightAllowance', section: 'operations' },
  { href: '/admin/reports',          icon: BarChart2,       key: 'reports',        section: 'operations' },
];

const employeeLinks = [
  { href: '/employee',               icon: LayoutDashboard, key: 'dashboard',     section: 'main' },
  { href: '/employee/payroll',       icon: DollarSign,      key: 'myPayslips',    section: 'main' },
  { href: '/employee/leaves',        icon: Calendar,        key: 'myLeaves',      section: 'requests' },
  { href: '/employee/advances',      icon: CreditCard,      key: 'myAdvances',    section: 'requests' },
  { href: '/employee/team',          icon: UsersRound,      key: 'teamRequests',  section: 'requests' },
  { href: '/employee/attendance',    icon: Clock,           key: 'myAttendance',  section: 'operations' },
  { href: '/employee/profile',       icon: UserCircle,      key: 'myProfile',     section: 'operations' },
];

const sectionKeys: Record<string, 'mainMenu' | 'requests' | 'operations'> = {
  main: 'mainMenu', requests: 'requests', operations: 'operations',
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
    <aside className="fixed inset-y-0 start-0 z-50 w-64 flex flex-col select-none" style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1120 100%)' }}>
      {/* Brand accent line */}
      <div className="h-[2px] shrink-0" style={{ background: 'linear-gradient(90deg, #991B1B, #B91C1C 40%, transparent)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[62px] shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {/* M logo mark */}
          <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #1c1c1c, #111)',
              border: '1px solid rgba(153,27,27,0.5)',
              boxShadow: '0 2px 14px rgba(153,27,27,0.18)',
            }}>
            <span className="font-black text-[17px] leading-none" style={{ fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #c0c0c0 20%, #991B1B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              M
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate" style={{ color: '#e2e8f0' }}>
              {lang === 'ar' ? 'المغربل' : 'El Megharbel'}
            </p>
            <p className="text-[10px] leading-tight font-medium" style={{ color: '#991B1B' }}>
              Ready Mix
            </p>
          </div>
        </div>
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="text-[10px] font-bold rounded-lg px-2 py-1 transition-colors shrink-0"
          style={{ color: '#475569', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {lang === 'ar' ? 'EN' : 'عر'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => {
          const sectionLinks = links.filter(l => l.section === section);
          if (!sectionLinks.length) return null;
          return (
            <div key={section}>
              <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(100,116,139,0.5)' }}>
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
                      className={cn('sidebar-item w-full', active && 'active')}
                    >
                      <Icon size={16} className="shrink-0" style={{ color: active ? '#fca5a5' : undefined }} />
                      <span className="flex-1 text-start text-[13px]">
                        {t(link.key as Parameters<typeof t>[0])}
                      </span>
                      {active && <ChevronRight size={13} style={{ color: '#f87171', opacity: 0.7 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* User footer */}
      <div className="p-3 space-y-1 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #991B1B, #B91C1C)', boxShadow: '0 2px 8px rgba(153,27,27,0.4)' }}>
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: '#e2e8f0' }}>{displayName}</p>
            <p className="text-[11px] truncate" style={{ color: '#475569' }}>{user.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full"
          style={{ color: '#ef4444' }}
        >
          <LogOut size={16} />
          <span className="text-[13px]">{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
