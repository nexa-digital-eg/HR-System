import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, lang: 'ar' | 'en' = 'ar'): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, lang: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date, lang: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(date: string | Date, lang: 'ar' | 'en' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getMonthName(month: number, lang: 'ar' | 'en' = 'ar'): string {
  const date = new Date(2024, month - 1, 1);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
  }).format(date);
}

export function calculateWorkHours(checkIn: string, checkOut: string): number {
  const inTime = new Date(checkIn);
  const outTime = new Date(checkOut);
  const diffMs = outTime.getTime() - inTime.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

export function generateEmployeeNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `EMP${timestamp}`;
}

export function calculateNetSalary(payslip: {
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime_amount: number;
  absence_deduction: number;
  late_deduction: number;
  advance_deduction: number;
  leave_deduction: number;
  other_deductions: number;
}): number {
  const gross = payslip.basic_salary + payslip.housing_allowance + payslip.transport_allowance + payslip.other_allowances + payslip.overtime_amount;
  const deductions = payslip.absence_deduction + payslip.late_deduction + payslip.advance_deduction + (payslip.leave_deduction || 0) + payslip.other_deductions;
  return Math.max(0, gross - deductions);
}

export function getDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
