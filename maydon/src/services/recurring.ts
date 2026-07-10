/**
 * Recurring Booking Service
 */

import { ulid } from 'ulid';
import type { Recurring, Booking } from './models.ts';
import { kv, keys, getAllRecurring } from './kv.ts';
import { createBooking } from './booking.ts';

export async function createRecurring(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  clientName: string,
  phone: string,
): Promise<{ success: boolean; recurring?: Recurring; error?: string }> {
  const id = ulid();

  const recurring: Recurring = {
    id,
    dayOfWeek,
    startTime,
    endTime,
    clientName,
    phone,
    active: true,
  };

  await kv.set(keys.recurring(id), recurring);
  return { success: true, recurring };
}

export async function deleteRecurring(
  id: string,
  mode: 'week' | 'series',
): Promise<void> {
  const recurring = await kv.get<Recurring>(keys.recurring(id));
  if (!recurring.value) return;

  if (mode === 'series') {
    await kv.delete(keys.recurring(id));
  } else {
    // Just deactivate
    recurring.value.active = false;
    await kv.set(keys.recurring(id), recurring.value);
  }
}

export async function generateRecurringBookings(): Promise<void> {
  const recurringList = await getAllRecurring();
  const settings = await kv.get<string[]>(['settings']);

  if (!settings.value) return;

  const tzOffset = 5 * 60 * 60 * 1000; // UTC+5
  const today = new Date();
  const localToday = new Date(today.getTime() + tzOffset);
  localToday.setHours(0, 0, 0, 0);

  // Generate for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(localToday);
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Find matching recurring bookings
    const matching = recurringList.filter(
      (r: Recurring) => r.active && r.dayOfWeek === dayOfWeek,
    );

    for (const rec of matching) {
      // Check if booking already exists for this date
      const dayBookings = await kv.list<string>({
        prefix: keys.bookingByDay(dateStr, ''),
      });

      let exists = false;
      for await (const entry of dayBookings) {
        const booking = await kv.get<Booking>(keys.booking(entry.value));
        if (
          booking.value?.recurringId === rec.id &&
          booking.value.status !== 'cancelled'
        ) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        await createBooking(
          null,
          rec.clientName,
          rec.phone,
          dateStr,
          rec.startTime,
          rec.endTime,
          'recurring',
          rec.id,
        );
      }
    }
  }
}
