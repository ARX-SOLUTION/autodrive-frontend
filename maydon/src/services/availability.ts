/**
 * Availability Service — Get free/busy slots
 */

import { getBookingsByDay, getSettings } from "./kv.ts";
import type { Booking } from "./models.ts";
import { timeToMinutes, minutesToTime, overlaps } from "./booking.ts";

export interface TimeSlot {
  start: string;
  end: string;
  isBusy: boolean;
  bookingId?: string;
}

export async function getDayAvailability(date: string): Promise<{
  slots: TimeSlot[];
  openTime: string;
  closeTime: string;
}> {
  const settings = await getSettings();
  if (!settings) {
    throw new Error("Settings not initialized");
  }

  const bookings = await getBookingsByDay(date);
  const confirmedBookings = bookings.filter((b: Booking) => b.status === "confirmed");

  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  const snap = settings.snapMin;

  const slots: TimeSlot[] = [];

  for (let startMin = openMin; startMin < closeMin; startMin += snap) {
    const endMin = startMin + snap;
    const startTime = minutesToTime(startMin);
    const endTime = minutesToTime(endMin);

    const overlappingBooking = confirmedBookings.find((b: Booking) =>
      overlaps(startTime, endTime, b.start, b.end)
    );

    slots.push({
      start: startTime,
      end: endTime,
      isBusy: !!overlappingBooking,
      bookingId: overlappingBooking?.id,
    });
  }

  return {
    slots,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
  };
}

export async function getAvailabilityRange(
  fromDate: string,
  toDate: string,
): Promise<Record<string, TimeSlot[]>> {
  const result: Record<string, TimeSlot[]> = {};

  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const dateStr = d.toISOString().split("T")[0];
    const day = await getDayAvailability(dateStr);
    result[dateStr] = day.slots;
  }

  return result;
}

export function findFreeRanges(slots: TimeSlot[], minDurationMin: number, maxDurationMin: number): Array<{
  start: string;
  end: string;
  durationMin: number;
}> {
  const ranges: Array<{ start: string; end: string; durationMin: number }> = [];
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  for (const slot of slots) {
    if (!slot.isBusy) {
      if (!rangeStart) {
        rangeStart = slot.start;
      }
      rangeEnd = slot.end;
    } else {
      if (rangeStart && rangeEnd) {
        const duration = timeToMinutes(rangeEnd) - timeToMinutes(rangeStart);
        if (duration >= minDurationMin) {
          ranges.push({
            start: rangeStart,
            end: rangeEnd,
            durationMin: duration,
          });
        }
        rangeStart = null;
        rangeEnd = null;
      }
    }
  }

  // Handle last range
  if (rangeStart && rangeEnd) {
    const duration = timeToMinutes(rangeEnd) - timeToMinutes(rangeStart);
    if (duration >= minDurationMin) {
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        durationMin: duration,
      });
    }
  }

  return ranges;
}
