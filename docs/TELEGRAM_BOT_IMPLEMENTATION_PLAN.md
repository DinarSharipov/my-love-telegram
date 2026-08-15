# My Love Telegram Bot — план реализации

Актуально на 15 августа 2026 года. План составлен по фактическим контрактам
backend `/Users/dinarsaripov/projects/my-love`, пользовательским сценариям
frontend `/Users/dinarsaripov/projects/my-love-frontend` и текущему состоянию
этого репозитория. Оба соседних проекта доступны только для чтения.

Текущий прогресс, решения и следующий шаг ведутся в
[`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md).

## 1. Цель

Telegram-бот дополняет My Love и решает две основные задачи:

1. доставляет выбранные пользователем уведомления о семейных событиях, задачах,
   приглашениях и напоминаниях;
2. позволяет выполнить ограниченный набор быстрых действий без открытия сайта,
   если backend предоставляет отдельную безопасную и идемпотентную команду.

Бот не является источником семейных данных, не дублирует backend business logic
и не подключается напрямую к PostgreSQL.

## 2. Продуктовые принципы

- Авторизация выполняется через одноразовую ссылку из уже авторизованного My Love,
  а не через ввод email и пароля в Telegram.
- Семейные сообщения доставляются только в личные чаты.
- Каждый канал уведомлений включается явно. Telegram не наследует автоматически
  существующие настройки email или in-app.
- Quiet hours, locale и timezone определяет backend; бот отвечает за Telegram
  transport и представление сообщения.
- Финансовые и wellbeing-данные остаются private-by-default. Приватные заметки,
  пароли, JWT, reset/invitation tokens в Telegram не отправляются.
- Быстрые действия повторно авторизуются backend. Callback data не считается
  доказательством прав пользователя.
- Повторная доставка одного события не должна создавать повторное сообщение или
  повторно выполнять действие.
- Бот не диагностирует отношения, не анализирует скрыто настроение партнёра и не
  вводит рейтинги или соревновательные streaks.

## 3. Целевая архитектура

### Bot service

- Node.js, TypeScript и grammY.
- `src/bot` — Telegram handlers, middleware, keyboards и templates.
- `src/application` — linking, delivery и callback use cases.
- `src/integrations/backend` — типизированный backend client и входящие event
  contracts.
- `src/config` — fail-fast environment validation.
- `src/common` — logging, errors и transport-independent helpers.
- Long polling используется локально; production принимает Telegram webhook.

### Backend boundary

Backend остаётся владельцем:

- My Love user/family identity и Telegram connection;
- одноразовых linking tokens;
- notification preferences, timezone и quiet hours;
- scheduling, domain events и semantic notification payload;
- authorization, optimistic concurrency, idempotency и audit быстрых действий.

Бот остаётся владельцем:

- Telegram updates и Bot API;
- локализованного безопасного шаблона сообщения;
- Telegram rate limits и transport retries;
- результата доставки и технической deduplication.

### Delivery flow

1. Domain transaction backend создаёт notification/outbox event атомарно с
   изменением доменных данных.
2. Backend передаёт версионированный semantic event боту через согласованный
   authenticated transport.
3. Бот валидирует schema version, recipient connection и event expiry.
4. Бот резервирует `eventId`, формирует локализованное сообщение и вызывает
   Telegram Bot API.
5. Результат доставки подтверждается; transient errors повторяются с backoff,
   permanent errors деактивируют или помечают connection.

Точный transport — signed internal webhook, pull API или очередь — фиксируется
отдельным ADR после согласования с backend. HTTP-вызов Telegram внутри backend
domain transaction запрещён.

## 4. Требуемый backend contract

Для end-to-end интеграции требуется следующий backend contract. Пункты 1–3
реализованы для linking; delivery-часть остаётся планом:

1. [x] `TelegramConnection`: My Love user, Telegram user/chat IDs, status,
       timestamps и delivery metadata с необходимыми uniqueness constraints.
2. [x] Authenticated endpoints выпуска, проверки и отзыва короткоживущего
       одноразового linking token. Backend хранит hash, expiry и single-use state.
3. [x] Обмен `/start <token>` на Telegram connection, включая uniqueness и
       single-use/expiry проверки.
4. [~] `telegramEnabled` существует в persistence, но должен быть опубликован в
   preferences DTO как отдельный opt-in.
5. Версионированный event envelope: `eventId`, `type`, `schemaVersion`, recipient,
   safe template data, locale/timezone, `occurredAt`, `availableAt`, `expiresAt` и
   deep-link target.
6. Authenticated delivery/acknowledgement contract с retry и dead-letter
   semantics.
7. Service-authenticated commands для inline actions с actor identity,
   membership/ownership checks, concurrency, idempotency и audit.
8. Producers минимум для task reminder, invitation/event decision,
   assigned/overdue task и opt-in shopping changes.

Frontend-команде после появления backend API потребуется экран управления
Telegram connection и preference. До изменения frontend это остаётся follow-up.

## 5. Этап 0 — discovery и границы

- Изучить `AGENTS.md`, roadmap/status, Prisma schema, notification, reminder и
  outbox code backend.
- Изучить frontend routes, профиль, dashboard, calendar, invitations и generated
  RTK Query contracts.
- Зафиксировать privacy boundaries, MVP, ownership компонентов и внешний contract.
- Не изменять соседние репозитории.

Критерий завершения: план не полагается на прямой доступ к БД или несуществующий
публичный endpoint; внешние зависимости явно отмечены.

## 6. Этап 1 — foundation и первый экран

- Создать strict TypeScript/grammY project и lockfile.
- Добавить валидируемую environment configuration и `.env.example` без секретов.
- Добавить structured redacted logging, error boundary и graceful shutdown.
- Реализовать private-chat policy.
- Реализовать `/start`, `/help`, `/status`, `/settings`, `/unlink`.
- Создать первый экран подключения с переходом в My Love и объяснением безопасной
  авторизации.
- Распознавать будущий opaque start payload, но не считать аккаунт связанным без
  успешного ответа backend.
- Добавить formatting, lint, typecheck, unit tests и production build.
- Добавить CI для обязательных проверок.

Критерий завершения: бот запускается с long polling, отвечает на команды, не
работает в группах и проходит локальные/CI проверки.

## 7. Этап 2 — безопасное account linking

- Описать согласованный contract и threat model в ADR.
- Реализовать backend client с timeout, typed errors и ограниченным retry.
- Обменивать opaque start token на connection без передачи пароля или JWT в чат.
- Реализовать состояния: unlinked, pending, linked, revoked и stale.
- Реализовать `/status` и `/unlink` на реальном backend API.
- Обработать expired/replayed token, wrong Telegram user, concurrent linking,
  уже занятую связь и недоступность backend.
- Добавить integration tests с mock backend и end-to-end staging scenario.

Критерий завершения: связь однозначна, отзыв действует немедленно, raw token не
сохраняется и security events аудитируются backend.

## 8. Этап 3 — notification delivery MVP

- Реализовать authenticated consumer выбранного delivery transport.
- Валидировать event envelope и поддерживаемую schema version.
- Добавить durable deduplication по `eventId` и acknowledgement.
- Реализовать локализованные templates и безопасный escaping.
- Добавить web deep links в поддерживаемые страницы frontend.
- Обработать Telegram `429 retry_after`, timeouts, transient `5xx`, blocked bot,
  missing chat, expired/poison event и exhausted retries.
- Соблюдать preferences и quiet hours до передачи события боту.
- Начать с `TASK_REMINDER`, затем добавить event/invitation/task/shopping events.

Критерий завершения: одно backend событие доставляется не более одного раза,
ошибки наблюдаемы и не приводят к бесконечным retries.

## 9. Этап 4 — быстрые действия

- Ввести opaque callback identifiers с коротким TTL.
- Реализовать complete/reopen task и accept/reject family event только через
  backend commands.
- Повторно проверять active connection и actor authorization.
- Использовать idempotency key и expected resource version.
- Показывать stale/forbidden/expired состояния без раскрытия чужих данных.
- Обновлять исходное сообщение после подтверждённого результата backend.

Критерий завершения: повторный callback безопасен, а потерянные права или stale
version не изменяют данные.

## 10. Этап 5 — digests и быстрый ввод

- Добавить opt-in ежедневный и недельный digest.
- Показывать ближайшие события, просроченные/назначенные задачи и незавершённые
  покупки без чувствительных подробностей.
- Добавить быстрый ввод задачи или покупки пошаговым диалогом только после
  появления backend command contract.
- Рассмотреть inline mode отдельным privacy-reviewed срезом.
- Рассмотреть Telegram Mini App после появления backend-проверки Telegram
  `initData`; Mini App не заменяет server-side linking и authorization.

## 11. Этап 6 — production readiness

- Реализовать production webhook с Telegram secret token, health/readiness и
  безопасным переключением с polling.
- Добавить metrics и alerts: delivery latency, failures, retries, backlog,
  duplicates, rate limits и deactivated connections без PII.
- Добавить shutdown/drain semantics и защиту от concurrent consumers.
- Провести threat-model/privacy review, нагрузочный тест и review хранения
  deduplication.
- Документировать secrets rotation, deploy, rollback, incident response и
  восстановление после недоступности Telegram/backend.
- Выполнить staging end-to-end и production readiness checklist.

## 12. Проверки каждого среза

Для обычного изменения выполнять:

1. `npm run format:check`;
2. `npm run lint`;
3. `npm run typecheck`;
4. `npm test`;
5. `npm run build`;
6. `git diff --check`;
7. smoke-check только когда он нужен и не отправляет неожиданные сообщения.

После завершения среза обновлять `docs/IMPLEMENTATION_STATUS.md`: результат,
проверки, решения, блокеры и следующий рекомендуемый шаг.
