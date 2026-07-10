/**
 * KV Client & Key Helpers
 */

import type { Booking, User, Admin, Settings, Recurring } from './models.ts';

const KV_PATH = Deno.env.get('KV_PATH') ?? 'maydon_kv';

export const kv = await Deno.openKv(KV_PATH);

// ========== Key Builders ==========

export const keys = {
  settings: ['settings'] as const,
  admin: (telegramId: number) => ['admins', telegramId] as const,
  user: (telegramId: number) => ['users', telegramId] as const,
  booking: (id: string) => ['bookings', id] as const,
  bookingByDay: (date: string, id: string) =>
    ['bookings_by_day', date, id] as const,
  bookingByUser: (telegramId: number, id: string) =>
    ['bookings_by_user', telegramId, id] as const,
  pendingByCreated: (createdAt: string, id: string) =>
    ['pending_by_created', createdAt, id] as const,
  dayVersion: (date: string) => ['day_version', date] as const,
  recurring: (id: string) => ['recurring', id] as const,
};

// ========== CRUD Helpers ==========

export async function getSettings(): Promise<Settings | null> {
  const res = await kv.get<Settings>(keys.settings);
  return res.value;
}

export async function upsertSettings(settings: Settings): Promise<void> {
  await kv.set(keys.settings, settings);
}

export async function getAdmin(telegramId: number): Promise<Admin | null> {
  const res = await kv.get<Admin>(keys.admin(telegramId));
  return res.value;
}

export async function addAdmin(admin: Admin): Promise<void> {
  await kv.set(keys.admin(admin.telegramId), admin);
}

export async function getUser(telegramId: number): Promise<User | null> {
  const res = await kv.get<User>(keys.user(telegramId));
  return res.value;
}

export async function upsertUser(user: User): Promise<void> {
  await kv.set(keys.user(user.telegramId), user);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const res = await kv.get<Booking>(keys.booking(id));
  return res.value;
}

export async function getBookingsByDay(date: string): Promise<Booking[]> {
  const entries = await kv.list<Booking>({
    prefix: keys.bookingByDay(date, ''),
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.key[2] as string);
    if (booking) bookings.push(booking);
  }
  return bookings;
}

export async function getBookingsByUser(
  telegramId: number,
): Promise<Booking[]> {
  const entries = await kv.list<string>({
    prefix: keys.bookingByUser(telegramId, ''),
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.value);
    if (booking) bookings.push(booking);
  }
  return bookings;
}

export async function getPendingRequests(): Promise<Booking[]> {
  const entries = await kv.list<string>({
    prefix: keys.pendingByCreated('', ''),
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.value);
    if (booking && booking.status === 'pending') {
      bookings.push(booking);
    }
  }
  return bookings;
}

export async function getRecurring(id: string): Promise<Recurring | null> {
  const res = await kv.get<Recurring>(keys.recurring(id));
  return res.value;
}

export async function getAllRecurring(): Promise<Recurring[]> {
  const entries = await kv.list<Recurring>({ prefix: keys.recurring('') });
  const recurring: Recurring[] = [];
  for await (const entry of entries) {
    recurring.push(entry.value);
  }
  return recurring;
}

// ========== Utility ==========

export async function initDefaultSettings(): Promise<void> {
  const existing = await getSettings();
  if (!existing) {
    await upsertSettings({
      openTime: '08:00',
      closeTime: '23:00',
      horizonDays: 7,
      minDurMin: 60,
      maxDurMin: 180,
      snapMin: 30,
    });
  }
}
