import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hr_token')?.value;

  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={payload} />
      <div className="ps-64 min-h-screen flex flex-col">
        <Header user={payload} />
        <main className="flex-1 p-6 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
