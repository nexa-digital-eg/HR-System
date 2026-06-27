# HR System — نظام الموارد البشرية

A comprehensive, bilingual (Arabic + English) HR and workforce management system built with **Next.js 15**, **TypeScript**, and **Supabase**.

## Features

### Admin Portal
- Dashboard with KPI cards, attendance charts, and recent activity
- Employee management (CRUD, search, department filter, pagination)
- Leave requests with approval workflow and employee notifications
- Advance/loan (سلف) requests — single-stage manager approval
- Payroll generation with advance deduction calculation
- Attendance management (manual + fingerprint device integration)
- Reports with analytics charts

### Employee Portal
- Personal dashboard with today's attendance, leave balances, quick actions
- My Payslips — monthly salary breakdown
- My Leaves — balance tracking, request submission
- My Advances — installment preview, request history
- My Attendance — monthly view with summary stats
- My Profile — personal info, change password

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT (jose + bcryptjs) |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| i18n | React Context (AR + EN) |
| RTL | Tailwind logical properties |

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set environment variables** — create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   JWT_SECRET=your_jwt_secret_min_32_chars
   ```

3. **Apply database migration** via Supabase MCP or dashboard

4. **Create first admin** — visit `/api/setup` once (GET request)
   - Phone: `01000000000`
   - Password: `Admin@123`

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Fingerprint Device Integration

Fingerprint devices sync attendance via:

```
POST /api/attendance/fingerprint
Content-Type: application/json

{
  "employee_number": "EMP001",
  "timestamp": "2025-06-26T09:05:00Z",
  "type": "in",          // "in" | "out"
  "device_id": "FP-01"  // optional
}
```

Late detection: arrivals after **09:15 AM** are automatically marked `LATE`.

## Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full access |
| `HR_MANAGER` | All modules |
| `DEPARTMENT_MANAGER` | Approve requests for their team |
| `FINANCE` | Payroll module |
| `EMPLOYEE` | Self-service portal only |
