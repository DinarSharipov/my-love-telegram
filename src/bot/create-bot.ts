import { Bot } from "grammy";
import type { Logger } from "pino";
import type { AppConfig } from "../config/config.js";
import { BackendClient } from "../integrations/backend/backend-client.js";
import {
  buildAuthScreen,
  buildLinkErrorScreen,
  buildLinkedScreen,
} from "./auth-screen.js";
import { parseStartPayload } from "./start-payload.js";

export function createBot(config: AppConfig, logger: Logger): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  const backend = new BackendClient(
    config.BACKEND_BASE_URL,
    config.TELEGRAM_INTEGRATION_SECRET,
  );
  const linkedChats = new Map<string, number>();
  const delivered = new Set<string>();

  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== "private") {
      await ctx.reply(
        "Для защиты семейных данных бот работает только в личном чате.",
      );
      return;
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    const token = parseStartPayload(ctx.message?.text);
    let screen = buildAuthScreen(config.FRONTEND_APP_URL);

    if (token && ctx.from && ctx.chat) {
      try {
        await backend.exchangeTelegramLink({
          token,
          telegramUserId: String(ctx.from.id),
          chatId: String(ctx.chat.id),
        });
        linkedChats.set(String(ctx.from.id), ctx.chat.id);
        screen = buildLinkedScreen(config.FRONTEND_APP_URL);
      } catch (error) {
        logger.warn(
          { error: error instanceof Error ? error.message : "unknown" },
          "telegram_link_exchange_failed",
        );
        screen = buildLinkErrorScreen();
      }
    } else if (ctx.from && ctx.chat) {
      try {
        const connection = await backend.status(String(ctx.from.id));
        if (connection?.status === "ACTIVE") {
          linkedChats.set(String(ctx.from.id), ctx.chat.id);
          screen = buildLinkedScreen(config.FRONTEND_APP_URL);
        }
      } catch (error) {
        logger.debug(
          { error: error instanceof Error ? error.message : "unknown" },
          "telegram_start_status_unavailable",
        );
      }
    }

    await ctx.reply(
      screen.text,
      screen.keyboard ? { reply_markup: screen.keyboard } : {},
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "My Love Bot присылает выбранные вами напоминания. Для начала нажмите /start и подключите аккаунт.",
    );
  });

  bot.command("status", async (ctx) => {
    if (!ctx.from) return;

    try {
      const connection = await backend.status(String(ctx.from.id));
      await ctx.reply(
        connection?.status === "ACTIVE"
          ? "✅ Telegram подключён к My Love."
          : "Аккаунт My Love не подключён. Нажмите /start, чтобы начать.",
      );
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : "unknown" },
        "telegram_connection_status_failed",
      );
      await ctx.reply("Не удалось проверить подключение. Попробуйте позже.");
    }
  });

  bot.command("unlink", async (ctx) => {
    if (!ctx.from) return;

    try {
      await backend.unlink(String(ctx.from.id));
      await ctx.reply("✅ Telegram отключён от My Love.");
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : "unknown" },
        "telegram_connection_unlink_failed",
      );
      await ctx.reply("Не удалось отключить Telegram. Попробуйте позже.");
    }
  });

  bot.command("settings", async (ctx) => {
    const screen = buildLinkedScreen(config.FRONTEND_APP_URL);
    await ctx.reply(
      "Настройки Telegram находятся в профиле My Love.",
      screen.keyboard ? { reply_markup: screen.keyboard } : {},
    );
  });

  bot.callbackQuery("auth:help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "My Love создаёт одноразовую ссылку на 10 минут. Она связывает аккаунты без передачи пароля боту.",
    );
  });

  bot.callbackQuery("auth:start", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Открываем авторизацию My Love" });
    await ctx.reply(
      "Локальный frontend недоступен из Telegram. После публикации My Love эта кнопка откроет безопасную авторизацию. Сейчас можно проверить внешний вид и команды бота.",
    );
  });

  bot.callbackQuery("auth:back", async (ctx) => {
    await ctx.answerCallbackQuery();
    const screen = buildAuthScreen(config.FRONTEND_APP_URL);
    await ctx.editMessageText(
      screen.text,
      screen.keyboard ? { reply_markup: screen.keyboard } : {},
    );
  });

  bot.catch((error) => {
    logger.error(
      { error: error.error instanceof Error ? error.error.message : "unknown" },
      "telegram_update_failed",
    );
  });

  setInterval(() => {
    void (async () => {
      for (const [telegramUserId, chatId] of linkedChats) {
        for (const notification of await backend.notifications(
          telegramUserId,
        )) {
          if (delivered.has(notification.id)) continue;
          delivered.add(notification.id);
          await bot.api.sendMessage(
            chatId,
            `${notification.title}${notification.body ? `\n\n${notification.body}` : ""}`,
          );
        }
      }
    })().catch((error) =>
      logger.warn(
        { error: error instanceof Error ? error.message : "unknown" },
        "telegram_notification_poll_failed",
      ),
    );
  }, 15_000);

  return bot;
}
