/**
 * Booking Service — Core business logic
 */

import { ulid } from 'ulid';
import type { Booking, BookingStatus } from './models.ts';
import {
  kv,
  keys,
  getBookingsByDay,
  getSettings,
  getUser,
  getPendingRequests,
} from './kv.ts';

// ========== Time Helpers ==========

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aStartMin = timeToMinutes(aStart);
  const aEndMin = timeToMinutes(aEnd);
  const bStartMin = timeToMinutes(bStart);
  const bEndMin = timeToMinutes(bEnd);
  return aStartMin < bEndMin && aEndMin > bStartMin;
}

// ========== Validation ==========

export async function validateBookingRequest(
  userId: number,
  date: string,
  start: string,
  end: string,
): Promise<{ valid: boolean; error?: string }> {
  const settings = await getSettings();
  if (!settings) {
    return { valid: false, error: 'Settings not initialized' };
  }

  const user = await getUser(userId);
  if (user?.isBlocked) {
    return { valid: false, error: 'User is blocked' };
  }

  // Snap validation
  const snap = settings.snapMin;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (startMin % snap !== 0 || endMin % snap !== 0) {
    return { valid: false, error: `Start/end must be on ${snap}-minute snap` };
  }

  // Duration validation
  const duration = endMin - startMin;
  if (duration < settings.minDurMin) {
    return {
      valid: false,
      error: `Minimum duration is ${settings.minDurMin} minutes`,
    };
  }
  if (duration > settings.maxDurMin) {
    return {
      valid: false,
      error: `Maximum duration is ${settings.maxDurMin} minutes`,
    };
  }

  // Working hours validation
  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    return {
      valid: false,
      error: `Outside working hours (${settings.openTime}-${settings.closeTime})`,
    };
  }

  // Horizon validation
  const today = new Date();
  const tzOffset = 5 * 60 * 60 * 1000; // UTC+5
  const localToday = new Date(today.getTime() + tzOffset);
  localToday.setHours(0, 0, 0, 0);

  const bookingDate = new Date(date + 'T00:00:00');
  const daysDiff = Math.floor(
    (bookingDate.getTime() - localToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff < 0 || daysDiff >= settings.horizonDays) {
    return {
      valid: false,
      error: `Booking horizon is ${settings.horizonDays} days`,
    };
  }

  // Pending limit validation (max 3 active pending)
  const userBookings = await getBookingsByDay(date);
  const pendingCount = userBookings.filter(
    (b: Booking) => b.userId === userId && b.status === 'pending',
  ).length;

  if (pendingCount >= 3) {
    return { valid: false, error: 'Maximum 3 pending requests allowed' };
  }

  // Duplicate request validation (same slot, same user)
  const duplicate = userBookings.find(
    (b: Booking) =>
      b.userId === userId &&
      b.date === date &&
      b.start === start &&
      b.end === end &&
      b.status === 'pending',
  );

  if (duplicate) {
    return {
      valid: false,
      error: 'You already have a pending request for this slot',
    };
  }

  return { valid: true };
}

// ========== Atomic Confirm (Critical Path) ==========

async function checkOverlapWithConfirmed(
  bookings: Booking[],
  start: string,
  end: string,
): Promise<boolean> {
  return bookings.some(
    (b: Booking) =>
      b.status === 'confirmed' && overlaps(start, end, b.start, b.end),
  );
}

export async function confirmBooking(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) {
    return { success: false, error: 'Booking not found' };
  }

  const b = booking.value;
  if (b.status !== 'pending') {
    return { success: false, error: 'Booking is not pending' };
  }

  const date = b.date;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. Read all bookings for the day
    const dayBookings = await getBookingsByDay(date);

    // 2. Check overlap with confirmed bookings
    if (checkOverlapWithConfirmed(dayBookings, b.start, b.end)) {
      // Overlap detected → reject
      await rejectBooking(id);
      return { success: false, error: 'Slot conflict detected' };
    }

    // 3. Get day version for atomic commit
    const dayVer = await kv.get<number>(keys.dayVersion(date));

    // 4. Atomic commit
    const ok = await kv
      .atomic()
      .check(dayVer)
      .set(keys.booking(id), {
        ...b,
        status: 'confirmed',
        decidedAt: new Date().toISOString(),
      })
      .set(keys.dayVersion(date), (dayVer.value ?? 0) + 1)
      .commit();

    if (ok.ok) {
      // 5. Reject overlapping pending requests
      await rejectOverlappingPending(date, b.start, b.end, id);
      return { success: true };
    }

    // Retry loop
  }

  return { success: false, error: 'Failed to confirm after retries' };
}

async function rejectOverlappingPending(
  date: string,
  start: string,
  end: string,
  excludeId: string,
): Promise<void> {
  const dayBookings = await getBookingsByDay(date);
  for (const b of dayBookings) {
    if (
      b.id !== excludeId &&
      b.status === 'pending' &&
      overlaps(start, end, b.start, b.end)
    ) {
      await rejectBooking(b.id);
    }
  }
}

export async function rejectBooking(id: string): Promise<void> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) return;

  const b = booking.value;
  await kv.set(keys.booking(id), {
    ...b,
    status: 'rejected',
    decidedAt: new Date().toISOString(),
  });
}

export async function cancelBooking(id: string): Promise<void> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) return;

  const b = booking.value;
  await kv.set(keys.booking(id), {
    ...b,
    status: 'cancelled',
    decidedAt: new Date().toISOString(),
  });
}

// ========== Create Booking ==========

export async function createBooking(
  userId: number | null,
  clientName: string | undefined,
  clientPhone: string | undefined,
  date: string,
  start: string,
  end: string,
  source: 'user' | 'admin' | 'recurring' = 'user',
  recurringId?: string,
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const validation =
    source === 'user'
      ? await validateBookingRequest(userId!, date, start, end)
      : { valid: true };

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const id = ulid();
  const createdAt = new Date().toISOString();

  const booking: Booking = {
    id,
    userId,
    clientName,
    clientPhone,
    date,
    start,
    end,
    status: source === 'admin' ? 'confirmed' : 'pending',
    source,
    recurringId,
    createdAt,
  };

  // Atomic write with indexes
  const ok = await kv
    .atomic()
    .set(keys.booking(id), booking)
    .set(keys.bookingByDay(date, id), id)
    .set(keys.pendingByCreated(createdAt, id), id)
    .commit();

  if (!ok.ok) {
    return { success: false, error: 'Failed to create booking' };
  }

  return { success: true, booking };
}
