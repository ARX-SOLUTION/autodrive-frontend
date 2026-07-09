/**
 * Telegram Bot — grammY handlers
 */

import { Bot, InlineKeyboard } from "grammy";
import type { Booking, User } from "./models.ts";
import { getPendingRequests, getUser, upsertUser, getAdmin, kv, keys } from "../kv.ts";
import { confirmBooking, rejectBooking, cancelBooking } from "../services/booking.ts";
import {
  notifyNewRequest,
  notifyUserQueued,
  notifyUserConfirmed,
  notifyUserRejected,
} from "../services/notify.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN not set");
}

export const bot = new Bot(botToken);

// Mock bot context for API notifications
const botContext = {
  sendMessage: async (chatId: number, text: string, options?: any) => {
    try {
      await bot.api.sendMessage(chatId, text, options);
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  },
  editMessageText: async (chatId: number, messageId: number, text: string) => {
    try {
      await bot.api.editMessageText(chatId, messageId, text);
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  },
};

// /start command
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  let user = await getUser(userId);
  if (!user) {
    user = {
      telegramId: userId,
      name: ctx.from.first_name ?? "Unknown",
      username: ctx.from.username,
      isBlocked: false,
      createdAt: new Date().toISOString(),
    };
    await upsertUser(user);
  }

  const isAdmin = !!(await getAdmin(userId));

  const welcomeText = `Assalomu alaykum, ${user.name}! 👋\n\n` +
    `Bu Maydon Booking boti.\n` +
    `Futbol maydonini band qilish uchun Mini App'dan foydalaning.\n\n` +
    (isAdmin ? "✅ Siz adminsiz." : "");

  const keyboard = new InlineKeyboard();
  keyboard.url("📅 Band qilish", Deno.env.get("MINI_APP_URL") ?? "https://maydon.uz");

  if (!user.phone) {
    keyboard.text("📞 Telefon raqam yuborish", "contact");
  }

  await ctx.reply(welcomeText, {
    reply_markup: keyboard,
  });
});

// Contact handler
bot.on("contact", async (ctx) => {
  const userId = ctx.from?.id;
  const contact = ctx.message?.contact;

  if (!userId || !contact) return;

  const user = await getUser(userId);
  if (!user) return;

  user.phone = contact.phone_number;
  await upsertUser(user);

  await ctx.reply("✅ Raqamingiz saqlandi!");
});

// Callback query handler for inline buttons
bot.callbackQuery(async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data || typeof data !== "string") return;

  const [action, bookingId] = data.split(":");
  const userId = ctx.from?.id;

  // Check admin
  const isAdmin = !!(await getAdmin(userId!));
  if (!isAdmin) {
    await ctx.answerCallbackQuery({ text: "Faqat adminlar uchun" });
    return;
  }

  switch (action) {
    case "confirm":
      const confirmResult = await confirmBooking(bookingId);
      if (confirmResult.success) {
        await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" });
        // TODO: Update message
      } else {
        await ctx.answerCallbackQuery({ text: "❌ Xato: " + confirmResult.error });
      }
      break;

    case "reject":
      await rejectBooking(bookingId);
      await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
      // TODO: Update message
      break;

    case "cancel":
      await cancelBooking(bookingId);
      await ctx.answerCallbackQuery({ text: "⚠️ Bekor qilindi" });
      break;

    default:
      await ctx.answerCallbackQuery({ text: "Noma'lum buyruq" });
  }
});

// Notify admins about new booking (called from API)
export async function notifyAdminsNewRequest(booking: Booking): Promise<void> {
  const user = booking.userId ? await getUser(booking.userId) : null;
  if (!user) return;

  const pending = await getPendingRequests();
  const queuePosition = pending.findIndex((b: Booking) => b.id === booking.id) + 1;

  // Get all admins
  const admins = await Array.fromAsync(kv.list({ prefix: keys.admin(0) }));
  
  for (const entry of admins) {
    const adminId = (entry as any).key[1] as number;
    await notifyNewRequest(botContext, adminId, booking, user, queuePosition);
  }

  // Notify user
  await notifyUserQueued(botContext, user.telegramId, booking, queuePosition);
}

// Notify user about confirmation
export async function notifyUserConfirmation(booking: Booking): Promise<void> {
  if (!booking.userId) return;
  await notifyUserConfirmed(botContext, booking.userId, booking);
}

// Notify user about rejection
export async function notifyUserRejection(
  booking: Booking,
  reason: string,
  alternativeSlots?: Array<{ start: string; end: string }>,
): Promise<void> {
  if (!booking.userId) return;
  await notifyUserRejected(botContext, booking.userId, booking, reason, alternativeSlots);
}
