/**
 * API Routes — Admin endpoints
 */

import { Hono } from "hono";
import { authMiddleware, requireAdmin } from "../auth.ts";
import {
  getPendingRequests,
  getBookingsByDay,
  getUser,
  upsertUser,
  upsertSettings,
  getSettings,
} from "../kv.ts";
import {
  createBooking,
  confirmBooking,
  rejectBooking,
  cancelBooking,
} from "../services/booking.ts";
import { createRecurring, deleteRecurring } from "../services/recurring.ts";
import { findFreeRanges } from "../services/availability.ts";

const api = new Hono();

// Apply auth + admin check to all routes
api.use("/*", authMiddleware());
api.use("/*", requireAdmin());

// GET /api/admin/requests — Pending requests (FIFO)
api.get("/admin/requests", async (c: any) => {
  const requests = await getPendingRequests();
  
  // Sort by createdAt (FIFO)
  requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return c.json({
    requests: requests.map((b, idx) => ({
      id: b.id,
      userId: b.userId,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      date: b.date,
      start: b.start,
      end: b.end,
      status: b.status,
      createdAt: b.createdAt,
      queuePosition: idx + 1,
    })),
  });
});

// POST /api/admin/bookings — Create manual booking (admin for client)
api.post("/admin/bookings", async (c: any) => {
  const { clientName, clientPhone, date, start, end } = await c.req.json();

  if (!clientName || !date || !start || !end) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const result = await createBooking(
    null,
    clientName,
    clientPhone,
    date,
    start,
    end,
    "admin"
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    success: true,
    booking: result.booking,
  });
});

// POST /api/admin/bookings/:id/confirm
api.post("/admin/bookings/:id/confirm", async (c: any) => {
  const id = c.req.param("id");
  const result = await confirmBooking(id);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify user
  try {
    const booking = await import("../kv.ts").then(m => m.getBooking(id));
    const { notifyUserConfirmation } = await import("../bot/handlers.ts");
    await notifyUserConfirmation(await booking);
  } catch (e) {
    console.error("Failed to notify user:", e);
  }

  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/reject
api.post("/admin/bookings/:id/reject", async (c: any) => {
  const id = c.req.param("id");
  await rejectBooking(id);
  
  // TODO: Notify user with alternative slots
  
  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/cancel
api.post("/admin/bookings/:id/cancel", async (c: any) => {
  const id = c.req.param("id");
  await cancelBooking(id);
  
  // TODO: Notify admins about available slot
  
  return c.json({ success: true });
});

// GET /api/admin/recurring
api.get("/admin/recurring", async (c: any) => {
  // TODO: Implement get all recurring
  return c.json({ recurring: [] });
});

// POST /api/admin/recurring
api.post("/admin/recurring", async (c: any) => {
  const { dayOfWeek, startTime, endTime, clientName, phone } = await c.req.json();

  if (!dayOfWeek || !startTime || !endTime || !clientName || !phone) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const result = await createRecurring(
    dayOfWeek,
    startTime,
    endTime,
    clientName,
    phone
  );

  return c.json(result);
});

// DELETE /api/admin/recurring/:id
api.delete("/admin/recurring/:id", async (c: any) => {
  const id = c.req.param("id");
  const mode = c.req.query("mode") ?? "series";
  await deleteRecurring(id, mode as "week" | "series");
  return c.json({ success: true });
});

// GET /api/admin/settings
api.get("/admin/settings", async (c: any) => {
  const settings = await getSettings();
  if (!settings) {
    return c.json({ error: "Settings not found" }, 404);
  }
  return c.json(settings);
});

// PUT /api/admin/settings
api.put("/admin/settings", async (c: any) => {
  const settings = await c.req.json();
  await upsertSettings(settings);
  return c.json({ success: true });
});

// POST /api/admin/users/:id/block
api.post("/admin/users/:id/block", async (c: any) => {
  const telegramId = parseInt(c.req.param("id"));
  
  let user = await getUser(telegramId);
  if (!user) {
    user = {
      telegramId,
      name: "Unknown",
      isBlocked: true,
      createdAt: new Date().toISOString(),
    };
  } else {
    user.isBlocked = true;
  }
  
  await upsertUser(user);
  return c.json({ success: true });
});

export default api;
