export type UserRole = 'SUPER_ADMIN' | 'HR_MANAGER' | 'DEPARTMENT_MANAGER' | 'FINANCE' | 'EMPLOYEE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
export type PayslipStatus = 'PENDING' | 'PAID';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  name_ar: string;
  name_en: string;
  created_at: string;
}

export interface Position {
  id: string;
  name_ar: string;
  name_en: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id?: string;
  employee_number: string;
  name_ar: string;
  name_en: string;
  email?: string;
  phone: string;
  department_id?: string;
  position_id?: string;
  manager_id?: string;
  hire_date: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  status: EmployeeStatus;
  national_id?: string;
  address?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  departments?: Department;
  positions?: Position;
  manager?: Employee;
}

export interface LeaveType {
  id: string;
  name_ar: string;
  name_en: string;
  days_per_year: number;
  is_paid: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  created_at: string;
  leave_types?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string;
  status: RequestStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  employees?: Employee;
  leave_types?: LeaveType;
  approver?: Employee;
}

export interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  reason: string;
  installments: number;
  installment_amount?: number;
  paid_amount: number;
  remaining_amount?: number;
  status: RequestStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  employees?: Employee;
  approver?: Employee;
}

export interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime_amount: number;
  absence_deduction: number;
  late_deduction: number;
  advance_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: PayslipStatus;
  paid_at?: string;
  notes?: string;
  created_at: string;
  employees?: Employee;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  source: string;
  notes?: string;
  work_hours?: number;
  created_at: string;
  employees?: Employee;
}

export interface Notification {
  id: string;
  user_id: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  type: string;
  is_read: boolean;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export interface JWTPayload {
  sub: string;
  role: UserRole;
  employee_id?: string;
  name_ar?: string;
  name_en?: string;
  phone: string;
  position_name_ar?: string;
  position_name_en?: string;
  iat?: number;
  exp?: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  pendingAdvances: number;
  todayPresent: number;
  todayAbsent: number;
  totalMonthlySalary: number;
}
