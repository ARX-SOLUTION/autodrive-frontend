/**
 * Notification Service — Bot messages
 */

import type { Booking, User } from "./models.ts";
import { getSettings } from "./kv.ts";

interface BotContext {
  sendMessage: (chatId: number, text: string, options?: any) => Promise<void>;
  editMessageText: (chatId: number, messageId: number, text: string) => Promise<void>;
}

export async function notifyNewRequest(
  bot: BotContext,
  adminChatId: number,
  booking: Booking,
  user: User,
  queuePosition: number,
): Promise<void> {
  const text = `🆕 **Yangi so'rov**\n\n` +
    `👤 ${user.name}\n` +
    `📞 ${user.phone ?? "N/A"}\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n` +
    `🔢 Navbat: #${queuePosition}\n\n` +
    `[Yozish](tg://user?id=${user.telegramId})`;

  await bot.sendMessage(adminChatId, text, {
    parse_mode: "Markdown",
  });
}

export async function notifyUserQueued(
  bot: BotContext,
  userId: number,
  booking: Booking,
  queuePosition: number,
): Promise<void> {
  const text = `✅ So'rovingiz qabul qilindi!\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n` +
    `🔢 Siz navbatda #${queuePosition}\n\n` +
    `Admin tasdiqlashini kuting.`;

  await bot.sendMessage(userId, text);
}

export async function notifyUserConfirmed(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text = `✅ **Tasdiqlandi!**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Kelishingizni kutamiz!`;

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}

export async function notifyUserRejected(
  bot: BotContext,
  userId: number,
  booking: Booking,
  reason: string,
  alternativeSlots?: Array<{ start: string; end: string }>,
): Promise<void> {
  let text = `❌ **Rad etildi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Sabab: ${reason}`;

  if (alternativeSlots && alternativeSlots.length > 0) {
    text += `\n\n**Bo'sh vaqtlar:**\n`;
    for (const slot of alternativeSlots.slice(0, 5)) {
      text += `• ${slot.start} - ${slot.end}\n`;
    }
  }

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}

export async function notifyUserExpired(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text = `⏰ **Muddati o'tdi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Admin javob bermadi. Qayta so'rov yuborishingiz mumkin.`;

  await bot.sendMessage(userId, text);
}

export async function notifySlotAvailable(
  bot: BotContext,
  adminChatId: number,
  booking: Booking,
  pendingCount: number,
): Promise<void> {
  const text = `🔓 **Slot bo'shadi!**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Navbatda ${pendingCount} ta so'rov bor.`;

  await bot.sendMessage(adminChatId, text);
}
