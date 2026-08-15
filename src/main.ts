import { createBot } from "./bot/create-bot.js";
import { createLogger } from "./common/logger.js";
import { loadConfig } from "./config/config.js";

const config = loadConfig();
const logger = createLogger(config);
const bot = createBot(config, logger);

if (config.TELEGRAM_MODE !== "polling") {
  throw new Error("Webhook mode is not implemented yet");
}

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "bot_stopping");
  void bot.stop();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

logger.info("bot_starting");
await bot.start({
  allowed_updates: ["message", "callback_query"],
  onStart: (botInfo) =>
    logger.info({ username: botInfo.username }, "bot_started"),
});
