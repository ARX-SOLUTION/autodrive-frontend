/**
 * Main Application — Hono + grammY webhook + cron
 */

import { Hono } from 'hono';
import { Bot } from 'grammy';
import userApi from './api/user.ts';
import adminApi from './api/admin.ts';
import { bot } from './bot/handlers.ts';
import { registerCronJobs } from './cron.ts';
import { initDefaultSettings, addAdmin } from './kv.ts';

const app = new Hono();

// Initialize settings on startup
await initDefaultSettings();

// Add first admin from env (for bootstrap)
const adminId = Deno.env.get('ADMIN_TELEGRAM_ID');
if (adminId) {
  await addAdmin({
    telegramId: parseInt(adminId),
    name: 'Admin',
    addedAt: new Date().toISOString(),
  });
}

// API routes
app.route('/api', userApi);
app.route('/api', adminApi);

// Webhook endpoint for Telegram bot
app.post('/webhook', async (c: any) => {
  try {
    const update = await c.req.json();
    await bot.handleUpdate(update);
    return c.text('OK');
  } catch (error: any) {
    console.error('Webhook error:', error);
    return c.text('Error', 500);
  }
});

// Health check
app.get('/health', (c) => c.text('OK'));

// Register cron jobs
registerCronJobs();

export default app;
