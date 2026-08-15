# AGENTS.md

## Product

Telegram-бот для My Love — приватного семейного приложения для двух партнёров и
их детей. Бот дополняет web-интерфейс: доставляет пользователю своевременные
уведомления и напоминания, даёт безопасные быстрые действия и ведёт обратно в
нужный экран приложения. Он не является отдельным источником семейных данных и
не должен дублировать бизнес-логику backend.

## Repositories and ownership

- Этот репозиторий (`/Users/dinarsaripov/projects/my-love-telegram`) — единственное
  место, которое разрешено изменять при работе над ботом.
- Backend: `/Users/dinarsaripov/projects/my-love`. Он доступен только для чтения:
  нельзя создавать, редактировать, форматировать, генерировать, удалять или
  коммитить там файлы, запускать миграции и другие изменяющие состояние команды.
- Frontend: `/Users/dinarsaripov/projects/my-love-frontend`. Он также доступен
  только для чтения на тех же условиях.
- Перед интеграционными изменениями сверять фактические backend DTO, OpenAPI,
  outbox/notification contracts и использование API на frontend. Недостающую
  поддержку фиксировать здесь как backend/frontend follow-up, не реализовывать в
  соседних репозиториях.

## Stack and architecture

- TypeScript на Node.js и grammY.
- Организовать код по обязанностям: `src/bot` (handlers/middleware/keyboards),
  `src/application` (use cases), `src/integrations/backend` (типизированный
  клиент и входящие delivery contracts), `src/config`, `src/common`.
- Telegram updates принимаются long polling в локальной разработке и webhook в
  production. Конкретный production transport должен выбираться конфигурацией.
- Handlers отвечают только за Telegram transport, parsing и presentation;
  orchestration живёт в application services, а семейные правила остаются на
  backend.
- Не подключаться напрямую к PostgreSQL backend и не импортировать его Prisma
  client. Интеграция выполняется только через согласованный authenticated API или
  event delivery contract.
- Все внешние операции должны иметь timeout, ограниченный retry/backoff и
  структурированные логи без токенов, текста приватных заметок и лишних
  персональных данных.

## Security and privacy

- Никогда не хранить Telegram bot token, backend credentials, webhook secret,
  пользовательские JWT или raw linking token в Git. Использовать валидируемые
  environment variables и коммитить только `.env.example` с заглушками.
- Токен, однажды переданный в чате или попавший в лог, считать раскрытым и
  перевыпустить через BotFather до первого запуска/deploy.
- Не связывать Telegram account с My Love только по username, телефону, email или
  произвольному `userId`. Нужен короткоживущий одноразовый linking token,
  выпущенный backend для уже аутентифицированного пользователя; backend хранит
  hash, expiry, single-use state и audit event.
- Не доверять входящему `chat_id`, `user_id`, callback payload или webhook body.
  Проверять Telegram webhook secret, подпись/credential backend delivery и
  соответствие активной связи пользователя.
- По умолчанию разрешать личный чат с ботом. Не отправлять семейные, финансовые
  или wellbeing-данные в группы. Приватные wellbeing notes, reset/invitation
  tokens и другие секреты не должны попадать в Telegram-сообщения.
- Callback data должна содержать opaque identifier, быть короткой, иметь срок
  действия и повторно проверять authorization на backend. Не кодировать в ней
  чувствительные данные.
- Учитывать timezone, locale, notification preferences и quiet hours пользователя
  или семьи. Системные security-события отделять от обычных уведомлений.
- Обрабатывать Telegram `403 blocked`/`chat not found`: прекращать повторную
  доставку и инициировать деактивацию связи через согласованный backend contract.

## Current backend and frontend context (read-only audit, 2026-08-15)

- Backend — NestJS/Prisma/PostgreSQL с `/api/v1`, JWT auth, family membership,
  audit log и transactional outbox.
- Реализованы family invitations, family events, first date, tasks и task
  routines, shopping lists, notification inbox, task reminders, dashboard,
  notification preferences и quiet hours.
- `TaskReminder` сейчас атомарно превращается maintenance worker-ом только в
  in-app `TASK_REMINDER`; `OutboxEvent` поддерживает только `email.send`.
- Backend реализовал `TelegramConnection`, 10-минутные одноразовые link tokens,
  публичный token exchange и защищённые integration status/unlink endpoints.
- Следующий заявленный backend-срез — notification producers для shopping,
  tasks и events. Telegram delivery channel/consumer пока отсутствует.
- Frontend использует React/RTK Query и уже имеет профиль/security flows,
  приглашения, календарь, первую встречу и dashboard с задачами. Generated API
  содержит endpoints задач, покупок и notifications, но отдельного Telegram
  settings/link flow пока нет.

## Bot scope

### MVP

- `/start` с понятным состоянием: бот не связан, связан или связь устарела.
- Безопасная привязка из одноразовой deep link вида `t.me/<bot>?start=<opaque>`;
  бот обменивает opaque token на backend, не получает пароль пользователя.
- `/help`, `/status`, `/settings`, `/unlink`.
- Доставка backend-generated уведомлений с deduplication по стабильному event ID,
  корректным escaping/formatting и deep link в web app.
- Напоминания о задачах; затем события, приглашения/предложения, назначенные или
  просроченные задачи и изменения списка покупок.
- Быстрые действия только там, где backend предоставляет отдельную идемпотентную
  команду и повторно проверяет права: например, завершить задачу или принять/
  отклонить предложение события.
- Локализация минимум `ru-RU`, timezone-aware delivery и соблюдение quiet hours.

### Useful follow-ups

- Ежедневный/недельный digest: ближайшие события, просроченные задачи и покупки.
- Быстрое создание задачи или позиции покупки через пошаговый диалог, когда для
  bot/service identity появится безопасный backend command contract.
- Inline mode для добавления семейной задачи из другого личного чата — только
  после отдельной privacy review.
- Уведомления о годовщинах/первой встрече и мягкие семейные ритуалы без streaks,
  рейтингов партнёров и психологических выводов.
- Telegram Mini App может переиспользовать web UX позднее; это отдельный срез с
  проверкой Telegram init data на backend, а не замена linking/auth flow.

### Explicitly out of scope

- Хранение семейной доменной модели в боте или прямое чтение backend database.
- Login по email/password через Telegram, пересылка access tokens в сообщения.
- Диагностика отношений, анализ настроения партнёра, surveillance и рейтинги.
- Отправка приватных финансовых/wellbeing данных без явного granular opt-in.

## Required integration contract (backend follow-up)

До end-to-end MVP backend-команде требуется согласовать и реализовать:

1. [x] Модель Telegram connection: My Love `userId`, Telegram user/chat IDs,
       status, timestamps, locale и optional delivery metadata; один Telegram
       аккаунт не может незаметно принадлежать нескольким пользователям.
2. [x] Authenticated endpoints выпуска/проверки/отзыва одноразового linking token и
       просмотр/отключение связи в настройках пользователя; security audit обязателен.
3. [~] Поле `telegramEnabled` добавлено в БД и включается при exchange, но его
   ещё нет в notification preferences DTO/API для явного управления пользователем.
   Правила quiet
   hours и fallback не должны выводиться только из существующих email/in-app flags.
4. Transactional notification/outbox event envelope: `eventId`, schema version,
   type, recipient/connection reference, locale/timezone, safe template data,
   occurred/available/expiry timestamps и deep-link target. Не передавать
   произвольный готовый HTML или приватные notes.
5. Защищённая доставка backend → bot (pull/queue либо signed internal webhook),
   retry/dead-letter semantics и idempotent acknowledgement. Backend domain
   transaction должна атомарно создавать событие; HTTP-вызов Telegram внутри
   неё запрещён.
6. Отдельные backend commands для inline actions с service authentication,
   actor identity, membership/ownership checks, optimistic concurrency,
   idempotency и audit.
7. Producers как минимум для due task reminder, invitation/event decision,
   assigned/overdue task и opt-in shopping changes.

Предпочтительная граница: backend владеет связью, preferences, расписанием и
формированием semantic event; бот владеет Telegram transport, шаблоном сообщения,
rate limiting и delivery result. Точный transport остаётся ADR до согласования с
backend-командой.

## Configuration

Планируемые переменные (названия уточняются при scaffold):

- `NODE_ENV`, `LOG_LEVEL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MODE=polling|webhook`
- `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET`, `PORT`
- `BACKEND_BASE_URL`
- credentials/signing keys согласованного internal integration contract

Конфигурация должна fail fast валидироваться при старте. Секреты маскируются в
ошибках и логах.

## Quality

- Включить strict TypeScript, ESLint, Prettier и lockfile; зависимости добавлять
  только по необходимости.
- Unit-тестировать parsers, templates, callback encoding, configuration и use
  cases. Integration-тесты должны мокировать Telegram Bot API и backend boundary.
- Покрыть duplicate delivery, retries, expired linking/callback tokens, blocked
  bot, unauthorized/cross-user action, quiet hours, timezone/DST и Telegram rate
  limit (`retry_after`).
- Перед завершением обычного среза запускать `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm test` и `npm run build`, когда эти
  scripts появились.

## Continuity

- Перед существенной работой читать `docs/IMPLEMENTATION_STATUS.md`; подробный
  порядок этапов находится в `docs/TELEGRAM_BOT_IMPLEMENTATION_PLAN.md`.
- После каждого законченного среза обновлять status: результат, проверки,
  решения, блокеры и следующий рекомендуемый шаг.
- План менять только при изменении продукта, архитектуры или порядка этапов;
  текущий прогресс вести в status, а не переписывать roadmap задним числом.
- Фактический код и внешние backend/frontend contracts имеют приоритет над
  устаревшим текстом документов; найденные расхождения сразу фиксировать в status.

## Implementation plan and status

Статусы: `[x]` готово, `[~]` выполняется, `[ ]` запланировано, `[!]` внешний
блокер.

### Phase 0 — discovery and contracts

- [x] Изучены правила, roadmap/status, схема и текущие notification/outbox/
      reminder contracts backend без изменений соседнего репозитория.
- [x] Изучены frontend architecture, реализованные пользовательские сценарии и
      generated API без изменений соседнего репозитория.
- [x] Зафиксированы границы, privacy rules, MVP и безопасная целевая архитектура.
- [~] Linking часть backend integration contract реализована; delivery и commands
  остаются внешними блокерами.
- [ ] После согласования записать transport/auth/linking решения в короткий ADR в
      этом репозитории.

### Phase 1 — standalone bot foundation

- [x] Создать Node.js/TypeScript/grammY project, scripts и lockfile.
- [x] Добавить валидируемую конфигурацию, `.env.example`, structured redacted
      logging и graceful shutdown.
- [x] Реализовать bot composition, error boundary, `/start`, `/help`, `/status`,
      `/settings`, `/unlink` и private-chat policy.
- [~] Добавить unit tests и CI checks: локальные unit/lint checks добавлены, CI ещё нет.

### Phase 2 — account linking

- [x] Backend one-time linking endpoints и модель connection реализованы.
- [x] Реализовать deep-link parsing/exchange, status и unlink.
- [ ] Проверить expiry, replay, wrong Telegram user, concurrent linking и audit
      expectations end-to-end.

### Phase 3 — notification delivery MVP

- [!] Зависит от backend Telegram preference и delivery/outbox envelope.
- [ ] Реализовать authenticated consumer, schema/version validation и durable
      deduplication.
- [ ] Добавить безопасные локализованные templates, web deep links, retries,
      Telegram rate-limit handling и delivery acknowledgement.
- [ ] Начать с `TASK_REMINDER`, затем invitations/events/tasks/shopping producers.
- [ ] Проверить quiet hours, timezone/DST, blocked chat и poison event scenarios.

### Phase 4 — inline actions and digests

- [!] Зависит от backend service-authenticated command endpoints.
- [ ] Добавить idempotent callback actions с expiry и повторной authorization.
- [ ] Добавить opt-in digest и команды быстрого просмотра ближайших дел.
- [ ] Быстрое создание задач/покупок выполнять только через backend commands.

### Phase 5 — production readiness

- [ ] Настроить production webhook с secret path/header, health/readiness и
      zero-downtime-safe startup.
- [ ] Добавить metrics/alerts для delivery latency, failures, retries, backlog,
      duplicate events и deactivated connections без утечки PII.
- [ ] Провести threat-model/privacy review, load/rate-limit test, backup/recovery
      review хранилища deduplication и runbook ротации секретов.
- [ ] Выполнить staging end-to-end и документировать deploy/rollback.

## Current handoff

- Состояние репозитория: создан TypeScript/grammY foundation, безопасная
  конфигурация, команды и первый экран подключения аккаунта.
- Текущий завершённый срез: локальная часть Phase 1 без CI.
- Live smoke-check: long polling успешно подключён к Telegram Bot API; процесс
  после проверки остановлен.
- Текущий блокер live end-to-end проверки: новый backend образ/миграция ещё не
  развёрнуты, а одинаковый `TELEGRAM_INTEGRATION_SECRET` не настроен с двух сторон.
- Следующий безопасный срез: CI и integration tests bot handlers; delivery
  реализовать после появления backend event transport.
- После каждого законченного среза обновлять чек-листы и этот handoff: изменения,
  проверки, решения, блокеры и следующий рекомендуемый шаг.
