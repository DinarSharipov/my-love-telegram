# My Love Telegram Bot

Telegram-канал уведомлений и напоминаний для My Love. Реализованы безопасное
подключение через одноразовую ссылку, проверка статуса и отключение аккаунта.

## Development

1. Скопировать `.env.example` в `.env`, указать новый токен от BotFather и тот же
   `TELEGRAM_INTEGRATION_SECRET`, который настроен на backend.
2. Установить зависимости: `npm install`.
3. Запустить long polling: `npm run dev`.

Проверки: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`.
