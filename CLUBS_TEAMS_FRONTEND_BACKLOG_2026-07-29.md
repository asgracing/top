# Clubs & Teams frontend backlog

Дата актуализации: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production: без изменений.

## Завершённый срез F1 — публичный каталог

- [x] отдельный маршрут `/teams/?tab=clubs|teams`;
- [x] загрузка только через isolated
  `public-cache-clubs-teams/current.json`;
- [x] привязка каждой страницы и asset URL к активному immutable
  `rating_run_id`;
- [x] schema/kind/entity/page/total validation;
- [x] загрузка всех backend pages без потери записей;
- [x] карточки: место, очки, гонки, участники, средние ELO/SR, клуб команды;
- [x] approved logo или безопасный текстовый fallback;
- [x] поиск по названию, slug и клубу команды;
- [x] loading/empty/error/retry states;
- [x] RU/EN для нового маршрута;
- [x] responsive grid 3/2/1 columns;
- [x] keyboard-compatible tabs, search и navigation controls;
- [x] `textContent`/safe DOM без динамического HTML;
- [x] local-only data override, который игнорируется на production hostname;
- [x] dist allowlist, reference verification и smoke route.

## Частично закрытые пункты основного backlog

- `CLUB-WEB-010`: маршрут и вкладки готовы; явная пользовательская пагинация не
  требуется текущему loader, потому что он собирает все immutable backend pages.
- `CLUB-WEB-015`: состояния готовы для public catalog, но ещё нужны на detail и
  account страницах.
- `CLUB-WEB-016`: RU/EN готовы для public catalog.
- `CLUB-WEB-017`: responsive и keyboard foundation готовы; фактическая visual
  matrix desktop/tablet/mobile отложена, потому что браузер в текущей сессии
  недоступен.
- `CLUB-WEB-018`: строгий public snapshot contract, безопасные URL и DOM готовы
  для catalog slice; CSP проверяется при staging integration.

## Завершённая реализация F2 — публичные профили

- [x] статически совместимый маршрут клуба `/clubs/?slug={slug}`;
- [x] статически совместимый маршрут команды `/teams/detail/?slug={slug}`;
- [x] поддержка будущих rewrite-маршрутов `/clubs/{slug}` и `/teams/{slug}` в
  клиентском resolver;
- [x] переходы из всех catalog cards и между связанными клубом/командами;
- [x] roster со ссылками на публичные профили пилотов;
- [x] описание RU/EN, short name и безопасная внешняя ссылка website;
- [x] общий рейтинг: место, очки, гонки, ELO, SR и участники;
- [x] последние зачётные гонки: дата, трасса, формат, режим и очки;
- [x] loading/error/retry/empty states;
- [x] строгая проверка detail identity, active `rating_run_id`, roster roles,
  дубликатов, URL и immutable asset path;
- [x] responsive layouts для desktop/tablet/mobile на уровне CSS;
- [x] dist allowlist, required artifacts и smoke routes;
- [x] полный `npm run ci`: 224/224 unit tests, build, dist, references и smoke.

### Ограничения F2, оставленные открытыми

- [ ] фактическая visual matrix desktop/tablet/mobile: встроенный браузер в
  сессии не предоставил ни одного backend;
- [ ] красивые URL без query (`/clubs/{slug}`, `/teams/{slug}`): GitHub Pages
  не поддерживает wildcard rewrite, поэтому потребуется внешний reverse proxy
  или build-time генерация каталогов;
- [ ] ссылка в общей production-навигации и sitemap: добавлять только после
  визуального checkpoint и отдельного решения о публикации;
- [ ] CSP проверяется при staging/production integration.

## Завершённая реализация F3 — контексты рейтинга

- [x] строгий loader `ratings/{general|hourly|championship}/{clubs|teams}`;
- [x] все страницы одного представления привязаны к единому active
  `rating_run_id`;
- [x] проверка kind/context/entity/season/page/offset/limit/context version и
  digest-формата;
- [x] `/teams/?context=general|hourly|championship&tab=clubs|teams`;
- [x] RU/EN context controls и сохранение состояния в URL;
- [x] защита от гонки запросов при быстром переключении контекста;
- [x] компактный Hourly-зачёт клубов/команд внутри `/hourly/`;
- [x] компактный Championship-зачёт внутри `/hourly/championship/`;
- [x] переход к общему рейтингу клубов/команд из секции рейтинга главной;
- [x] reusable safe-DOM embed без изменений существующих Hourly и Championship
  `app.js`;
- [x] loading/error/empty states и responsive layout;
- [x] полный `npm run ci`: 227/227 unit tests, build, dist, references и smoke.

### Ограничения F3, оставленные открытыми

- [ ] фактическая visual matrix: browser backend снова недоступен;
- [ ] если обязательна именно встроенная вкладка Teams в монолитной таблице
  пилотов на главной, она остаётся отдельной задачей; сейчас добавлен безопасный
  переход в полный General-зачёт;
- [ ] season-specific championship snapshots (`ratings/seasons/{season_id}`)
  пока не выведены — F3 использует канонический cumulative `championship`;
- [ ] detail-профили показывают канонический General rating, выбранный context
  пока не переносится в detail;
- [ ] production navigation/sitemap и CSP staging gate не изменялись.

## Следующий срез F4

1. Личный кабинет через `auth.asgracing.ru`.
2. Pending receipts, создание/редактирование, приглашения и membership.
3. Безопасная загрузка изображения через уже готовый auth/backend pipeline.
4. Visual/accessibility checkpoint, затем отдельное решение о production.

## Завершённый безопасный срез F4a — read-only кабинет

- [x] существующий `/account/` читает `clubs_teams` из того же `GET https://auth.asgracing.ru/v1/me`;
- [x] строгая fail-closed модель: разрешены только публичные ID/slug, название, роль, статус и версия;
- [x] внутренние entity ID, receipt signature, произвольные `result/error` и неизвестные поля отбрасываются;
- [x] состояния feature disabled, snapshot stale/unavailable, empty и active membership;
- [x] карточки текущего клуба и команды со ссылками на публичные профили;
- [x] pending command/asset counters и до пяти безопасно нормализованных статусов операций;
- [x] RU/EN и адаптивная раскладка 2/1;
- [x] существующие race-number и Discord-функции не изменены;
- [x] mutations отсутствуют: этап можно публиковать или откатывать независимо от backend queue;
- [x] полный `npm run ci`: 230/230 unit, build, dist, references и smoke.

### Остаток F4b–F4d

- [ ] F4b: формы create/revise и membership/team-club actions с отдельными allowlisted payload models;
- [ ] обязательные guards F4b: Origin, CSRF, recent auth, Discord link, entity role/version и fresh snapshot;
- [ ] polling конкретной команды и локализованные безопасные ошибки без вывода raw receipt;
- [ ] F4c: asset upload с клиентскими ограничениями, preview и backend moderation receipt;
- [ ] F4d: visual/accessibility matrix и ручная интеграционная проверка на staging auth/backend;
- [ ] production navigation/sitemap/CSP gate и deploy — только отдельным решением.

Visual matrix F4a не выполнена: 01.08.2026 встроенная среда вернула пустой список browser backends.
