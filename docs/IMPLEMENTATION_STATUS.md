# My Love Telegram Bot — статус реализации

Последнее обновление: 16 августа 2026 года.

Этот файл — точка входа для следующей рабочей сессии. Сначала прочитать его и
корневой `AGENTS.md`; подробный порядок этапов находится в
[`TELEGRAM_BOT_IMPLEMENTATION_PLAN.md`](./TELEGRAM_BOT_IMPLEMENTATION_PLAN.md).
После каждого законченного среза обновлять текущий фокус, чек-листы и журнал.

## Текущий фокус

- Этап плана: **3 — notification delivery MVP**.
- Последний завершённый срез: **production deployment и совместимость экранов с
  непубличным frontend URL**.
- Следующий рекомендуемый срез: **ручная E2E-проверка привязки и уведомления
  реальным Telegram-пользователем**.
- Внешние production secrets заданы в GitHub Actions; бот использует polling и
  успешно обращается к production backend.

## Что было в репозитории до начала реализации

- [x] Пустой репозиторий с одним `README.md`.
- [x] Backend и frontend изучены строго в read-only режиме.
- [x] Создан `AGENTS.md` с правилами, границами и первоначальным планом.

## Прогресс плана

Статусы: `[x]` готово, `[~]` выполняется, `[ ]` запланировано, `[!]` внешний
блокер.

### Этап 0 — discovery и границы

- [x] Изучены backend `AGENTS.md`, plan/status, Prisma schema и модули auth,
      families, events, tasks, shopping, notifications, reminders и outbox.
- [x] Изучены frontend `AGENTS.md`, roadmap/status, routes, profile, dashboard,
      calendar, invitations и generated API.
- [x] Зафиксированы privacy rules, ownership компонентов и MVP.
- [x] Подтверждено, что backend outbox поддерживает только `email.send`, а task
      reminders создают только in-app `TASK_REMINDER`.
- [x] Соседние репозитории не изменялись.

### Этап 1 — foundation и первый экран

- [x] Создан Node.js/TypeScript/grammY project и lockfile.
- [x] Включён strict TypeScript.
- [x] Добавлены `.gitignore`, `.env.example` и валидируемая конфигурация.
- [x] Реальный bot token хранится только в игнорируемом `.env`.
- [x] Добавлены Pino logging с redaction и graceful shutdown.
- [x] Реализована private-chat policy.
- [x] Реализованы `/start`, `/help`, `/status`, `/settings`, `/unlink`.
- [x] Создан первый экран подключения с inline-кнопкой в профиль My Love.
- [x] Основная кнопка стартового экрана называется `🔐 Авторизоваться`; повторный
      `/start` показывает состояние уже активной связи.
- [x] Реализован безопасный parser будущего opaque `/start <token>` payload.
- [x] До появления backend API linking payload не создаёт ложную связь и
      показывает честное pending-состояние.
- [x] Добавлены Prettier, ESLint, typecheck, unit tests и production build.
- [x] Выполнен live smoke-check long polling с Telegram Bot API; бот подключился
      как `@my_LOVE_telegrem_bot`, после проверки процесс остановлен.
- [x] Добавлен CI/CD workflow для обязательных проверок и production deploy.

### Этап 2 — account linking

- [x] Backend: модель Telegram connection и linking endpoints реализованы.
- [ ] Зафиксировать transport/auth/linking ADR после согласования backend contract.
- [x] Добавить типизированный backend client boundary.
- [x] Реализовать реальный exchange.
- [x] Реализовать status и unlink в bot handlers.
- [~] Покрыть expiry, replay, wrong user, concurrent linking и backend failures:
  client failures покрыты, доменные сценарии требуют backend e2e.

### Этап 3 — notification delivery MVP

- [x] Бот читает аутентифицированный backend inbox выбранного пользователя.
- [~] Реализовать durable deduplication, retry и acknowledgement.
- [ ] Добавить durable deduplication, retry и acknowledgement.
- [ ] Реализовать templates и deep links.
- [ ] Начать с `TASK_REMINDER`, затем events, invitations, tasks и shopping.
- [ ] Покрыть quiet hours, timezone/DST, rate limits и permanent Telegram errors.

### Этап 4 — быстрые действия

- [!] Backend: service-authenticated command endpoints отсутствуют.
- [ ] Добавить expiring callback actions.
- [ ] Реализовать complete/reopen task.
- [ ] Реализовать accept/reject event.
- [ ] Проверять authorization, concurrency и idempotency на backend.

### Этап 5 — digests и быстрый ввод

- [ ] Добавить opt-in daily/weekly digest.
- [ ] Добавить команды просмотра ближайших дел.
- [ ] Добавить создание задач и покупок после появления backend commands.
- [ ] Отдельно оценить Mini App и inline mode.

### Этап 6 — production readiness

- [x] Production long polling и Telegram bot token.
- [ ] Health/readiness, metrics и alerts.
- [ ] Shutdown/drain и concurrent-consumer safety.
- [ ] Threat-model, privacy и load review.
- [ ] Deploy/rollback/incident/secrets-rotation runbooks.
- [ ] Staging end-to-end и production checklist.

### Production smoke (2026-08-16)

- [x] Отдельный bot-repository развёрнут на `185.227.144.160`.
- [x] `BACKEND_BASE_URL` закреплён на production API
      `https://api.147.45.124.221.sslip.io`.
- [x] Контейнер стартует и проходит `bot_started` как `@my_LOVE_telegrem_bot`.
- [x] Контейнер аутентифицированно получает `200` от production Telegram
      integration API.
- [x] Исправлен production crash в ответах бота: inline-кнопки создаются только
      для публичного HTTPS frontend URL; HTTP/local URL больше не передаётся
      Telegram API.
- [ ] Проверить реальную привязку и доставку уведомления конкретным Telegram
      пользователем после ввода одноразового кода.

## Реализованная структура

- `src/main.ts` — startup, polling и graceful shutdown.
- `src/config/config.ts` — environment schema.
- `src/common/logger.ts` — structured redacted logger.
- `src/bot/create-bot.ts` — composition, middleware, commands и callbacks.
- `src/bot/auth-screen.ts` — первый экран подключения.
- `src/bot/start-payload.ts` — parser будущего linking token.
- `src/bot/*.spec.ts` — unit tests auth screen и payload parser.

## Принятые решения

- Основной auth flow — одноразовая deep link из авторизованного My Love.
- Email/password через Telegram не поддерживаются.
- Mini App рассматривается позднее и не заменяет backend verification.
- В production используется long polling; webhook сознательно не используется.
- Бот не получает прямой доступ к Prisma/PostgreSQL backend.
- Linking contract реализован на backend; бот считает связь успешной только после
  ответа token exchange.
- Реальный token находится в `.env`, но его необходимо перевыпустить перед
  production, поскольку первоначальное значение передавалось в чате.

## Известные пробелы и риски

- Прямая ссылка на frontend в Telegram доступна только после публикации frontend
  на HTTPS. При текущем HTTP test stand бот не показывает невалидную кнопку;
  основной flow через deep link из frontend работает.
- Нет persistent storage для delivery deduplication — оно понадобится на этапе 3.
- Webhook mode пока явно отклоняется при старте: production использует один
  long-polling consumer.
- `/settings` ведёт в профиль My Love; frontend UI Telegram-настроек ещё не готов.
- Username бота содержит `telegrem`; нужно решить, является ли это намеренным
  именем, и при необходимости изменить его через BotFather.
- CI отсутствует.

## Последние проверки

- `npm run format:check` — успешно.
- `npm run lint` — успешно.
- `npm run typecheck` — успешно.
- `npm test` — успешно, 3 suites / 11 tests.
- `npm run build` — успешно.
- `git diff --check` — успешно.
- Telegram long-polling smoke-check — успешно; процесс остановлен.

## Требуемые follow-up вне этого репозитория

Backend follow-up подробно описан в разделе 4 плана. Минимум для следующего
end-to-end этапа:

1. [x] Telegram connection model;
2. [x] одноразовый linking token flow;
3. [~] `telegramEnabled` есть в БД, но отсутствует в preferences DTO;
4. [ ] authenticated versioned delivery envelope;
5. [ ] idempotent backend commands для будущих callback actions.

Frontend follow-up после появления backend contract:

1. экран подключения/отключения Telegram в настройках;
2. переход по `?connect=telegram`;
3. granular Telegram notification preferences.

Эти изменения не выполняются из данного репозитория.

## Журнал сессий

| Дата       | Срез                     | Результат                                                                                                                  | Проверки                                            | Следующий шаг                           |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| 2026-08-15 | Discovery и план         | Изучены backend/frontend, создан `AGENTS.md`, определены границы, MVP и отсутствующий integration contract                 | read-only audit, `git diff --check`                 | Создать bot foundation                  |
| 2026-08-15 | Foundation и auth screen | Создан TS/grammY bot, config, logging, private-chat policy, команды, экран подключения и parser будущей одноразовой ссылки | format, lint, typecheck, 7 tests, build, live smoke | Добавить CI и fake backend boundary     |
| 2026-08-15 | Документация             | План и статус вынесены в отдельные документы по модели backend/frontend                                                    | format/check и link review                          | Поддерживать status после каждого среза |
| 2026-08-15 | Повторная сверка linking | Подтверждён backend contract; hardened client, реальные status/unlink и актуальные auth screens                            | format, lint, typecheck, tests, build               | CI и handler integration tests          |
| 2026-08-15 | Стартовый auth-визуал    | Компактная welcome-карточка, основная кнопка `Авторизоваться` и linked-state при повторном `/start`                        | format, lint, typecheck, tests, build               | Frontend connect flow и CI              |
