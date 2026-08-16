import { InlineKeyboard } from "grammy";

export interface AuthScreen {
  text: string;
  keyboard?: InlineKeyboard;
}

function canOpenInTelegram(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  );
}

export function buildAuthScreen(frontendAppUrl: string): AuthScreen {
  const authUrl = new URL("/profile", frontendAppUrl);
  authUrl.searchParams.set("connect", "telegram");
  const keyboard = new InlineKeyboard();

  if (canOpenInTelegram(authUrl)) {
    keyboard.url("🔐 Авторизоваться", authUrl.toString());
  } else {
    keyboard.text("🔐 Авторизоваться", "auth:start");
  }

  return {
    text: [
      "💞 My Love",
      "",
      "Ваш семейный помощник в Telegram",
      "",
      "После авторизации здесь будут приходить:",
      "• напоминания о задачах;",
      "• семейные события;",
      "• важные изменения и приглашения.",
      "",
      "Бот не запрашивает и не хранит пароль от My Love.",
    ].join("\n"),
    keyboard: keyboard.row().text("Как работает авторизация?", "auth:help"),
  };
}

export function buildLinkErrorScreen(): AuthScreen {
  return {
    text: [
      "Не удалось подключить Telegram.",
      "",
      "Ссылка могла истечь, уже использоваться или принадлежать другому аккаунту. Создайте новую ссылку в My Love и попробуйте ещё раз.",
    ].join("\n"),
    keyboard: new InlineKeyboard().text("← Вернуться", "auth:back"),
  };
}

export function buildLinkedScreen(frontendAppUrl: string): AuthScreen {
  const settingsUrl = new URL("/profile", frontendAppUrl);
  settingsUrl.searchParams.set("section", "notifications");

  return {
    text: [
      "✅ Авторизация завершена",
      "",
      "Telegram подключён к My Love. Вы будете получать выбранные уведомления в этом чате.",
    ].join("\n"),
    ...(canOpenInTelegram(settingsUrl)
      ? {
          keyboard: new InlineKeyboard().url(
            "Настройки уведомлений",
            settingsUrl.toString(),
          ),
        }
      : {}),
  };
}
