/**
 * Maydon Booking — Data Models
 */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'completed';

export type BookingSource = 'user' | 'admin' | 'recurring';

export interface Booking {
  id: string;
  userId: number | null;
  clientName?: string;
  clientPhone?: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  status: BookingStatus;
  source: BookingSource;
  recurringId?: string;
  createdAt: string; // ISO-8601, server time
  decidedAt?: string;
}

export interface User {
  telegramId: number;
  name: string;
  username?: string;
  phone?: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface Admin {
  telegramId: number;
  name: string;
  addedAt: string;
}

export interface Settings {
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  horizonDays: number;
  minDurMin: number;
  maxDurMin: number;
  snapMin: number;
}

export interface Recurring {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  clientName: string;
  phone: string;
  active: boolean;
}
