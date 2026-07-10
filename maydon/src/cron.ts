/**
 * Cron Jobs — Scheduled tasks
 */

import { kv, keys, getBookingsByDay } from './kv.ts';
import type { Booking } from './models.ts';
import { generateRecurringBookings } from './services/recurring.ts';

// Run every 15 minutes
export async function expirePending(): Promise<void> {
  const now = new Date();
  const tzOffset = 5 * 60 * 60 * 1000; // UTC+5
  const localNow = new Date(now.getTime() + tzOffset);

  const pending = await kv.list<string>({
    prefix: keys.pendingByCreated('', ''),
  });

  for await (const entry of pending) {
    const booking = await kv.get<Booking>(keys.booking(entry.value));
    if (!booking.value || booking.value.status !== 'pending') continue;

    const b = booking.value;
    const startDateTime = new Date(`${b.date}T${b.start}:00+05:00`);

    if (startDateTime < localNow) {
      await kv.set(keys.booking(b.id), {
        ...b,
        status: 'expired',
        decidedAt: new Date().toISOString(),
      });
      // TODO: Send notification to user
    }
  }
}

// Run every 15 minutes
export async function completeBookings(): Promise<void> {
  const now = new Date();
  const tzOffset = 5 * 60 * 60 * 1000; // UTC+5
  const localNow = new Date(now.getTime() + tzOffset);

  // Check last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(localNow);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const bookings = await getBookingsByDay(dateStr);

    for (const b of bookings) {
      if (b.status === 'confirmed') {
        const endDateTime = new Date(`${b.date}T${b.end}:00+05:00`);
        if (endDateTime < localNow) {
          await kv.set(keys.booking(b.id), {
            ...b,
            status: 'completed',
            decidedAt: new Date().toISOString(),
          });
        }
      }
    }
  }
}

// Run daily at 03:00
export async function generateRecurring(): Promise<void> {
  await generateRecurringBookings();
}

// Register cron jobs
export function registerCronJobs(): void {
  Deno.cron('expire-pending', '*/15 * * * *', () => {
    expirePending().catch(console.error);
  });

  Deno.cron('complete-bookings', '*/15 * * * *', () => {
    completeBookings().catch(console.error);
  });

  Deno.cron('generate-recurring', '0 3 * * *', () => {
    generateRecurring().catch(console.error);
  });
}
