# Clubs & Teams frontend backlog

## Текущий план выполнения с 11.08.2026

Порядок согласован по фактическим зависимостям, а не по старым номерам срезов:

1. пакетные приглашения;
2. полный staging round-trip `account → auth queue → backend apply → receipt/state`;
3. F4c: выбор, preview и безопасная загрузка логотипа;
4. визуальная модерация старого и нового логотипа в ASG Control Center;
5. публикация только approved-логотипа и очистка неиспользуемых assets;
6. клубные и командные Discord-роли;
7. canary на одном тестовом клубе и одной команде;
8. production feature flags отдельным решением после canary.

Общие гейты для этапов: RU/EN, mobile, keyboard/accessibility, CSP, отсутствие
утечек приватных идентификаторов, негативные тесты и проверяемый rollback.

### Стабилизация принятия приглашений — реализовано локально 11.08.2026

- [x] одна команда принятия блокирует обе кнопки заявки до обновления actor-state;
- [x] повторный клик не создаёт вторую `membership.resolve` в очереди;
- [x] `action_not_pending` и `incompatible_membership` имеют понятные RU/EN сообщения;
- [x] полный frontend verify: 258 тестов;
- [x] production canary с реальными пакетными приглашениями и принятием приглашения
  после исправления backend/auth sync выполнен 11.08.2026.

## Срез F4c — логотипы (реализовано локально 11.08.2026)

- [x] выбор PNG/JPEG в кабинете главы клуба или капитана команды;
- [x] клиентская проверка лимита 200 КиБ, квадратности и размера до 1024×1024;
- [x] локальный preview до отправки и освобождение временного object URL;
- [x] raw-body POST в существующий защищённый asset endpoint с CSRF и entity version;
- [x] bounded polling только созданного asset ID без вывода raw receipt;
- [x] статусы pending/approved/rejected и безопасный комментарий модератора в кабинете;
- [x] RU/EN и одноколоночная mobile-раскладка;
- [x] unit/quality/performance verify: 258 тестов;
- [ ] browser visual/accessibility pass в авторизованной сессии;
- [x] production canary на клубе ASG Racing и команде ASG Racing FORD POWER:
  upload → quarantine/re-encode → Admin GUI moderation → approved publication.

Публикация по-прежнему берёт только asset из approved revision. Проверка quarantine/re-encode,
удаление метаданных и очистка неиспользуемых файлов остаются серверными обязанностями.
Bounded terminal/orphan/stale-quarantine cleanup доставлен в production auth-контур;
первый production dry-run завершён без кандидатов на удаление.

## Production canary Discord-ролей — выполнен 11.08.2026

- [x] первый canary ограничен профилем `drv_b466bb6eedd8`, затем расширен на
  approved-состав ASG Racing и ASG Racing FORD POWER;
- [x] существующая permissionless-роль ASG Racing привязана без создания дубликата;
- [x] для команды создана одна permissionless-роль и назначена linked Discord-аккаунту;
- [x] повторный reconcile сохранил тот же role ID и не создал дубликат;
- [x] роль URL зарегистрирована как существующее исключение, но не назначена участнику
  вне подтверждённого состава United Racing League;
- [x] canary allowlist не позволяет worker снимать клубные/командные роли у остальных
  пользователей во время обычной рейтинговой синхронизации;
- [x] expanded canary: ASG Racing 11/11, Ford Power 2/2, роли существуют в одном
  экземпляре, URL не назначена ASG-участникам, retry/backoff восстановился после rate limit;
- [ ] глобальное включение для всех approved клубов и команд после периода наблюдения
  и drift/retry-тестов; diagnostics/manual reconcile в Admin GUI уже работают.

## P0 / визуальный и UX backlog

Визуальная и UX-доработка текущего production-фронтенда клубов и команд теперь
имеет приоритет выше оставшихся функциональных срезов. Актуальный аудит, порядок
работ и критерии приёмки вынесены в
`CLUBS_TEAMS_FRONTEND_P0_BACKLOG_2026-08-10.md`.

## Текущий срез — пакетные приглашения в состав

- [x] множественный выбор пилотов в управлении составом клуба или команды;
- [x] одна кнопка и одно подтверждение для отправки до 20 приглашений;
- [x] отдельная backend-команда на каждого получателя, чтобы частичный отказ не
  отменял успешно поставленные приглашения;
- [x] исключение из поиска действующих участников и пилотов с уже отправленным
  приглашением;
- [x] итог пакетной отправки: сколько приглашений поставлено в очередь и какие
  получатели были отклонены;
- [x] отображение имени получателя в исходящих заявках и приглашениях;
- [x] сохранение `subject_display_name` в allowlisted actor-state с обратной
  совместимостью старого snapshot-контракта;
- [ ] отдельные статусы для каждого получателя: queued, pending, accepted,
  rejected, expired;
- [x] одно обновление кабинета после постановки всего пакета, без ожидания и
  подтверждения каждой команды по отдельности;
- [x] RU/EN, keyboard-compatible checkbox selection и mobile layout;
- [ ] browser visual/accessibility pass и интеграционный тест частично успешной
  пачки на staging auth/backend.

Приглашённые пилоты по-прежнему принимают или отклоняют приглашения каждый за
себя. Пакетный сценарий убирает только повторяющиеся действия главы клуба или
капитана команды.

Дата актуализации: 11.08.2026

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

## Завершённый срез F4b1 — create/revise

- [x] формы создания клуба и команды в существующем `/account/`;
- [x] команда пользователя с активным клубом автоматически получает канонический внутренний `club_id`;
- [x] редактирование доступно только `head` клуба и `captain` команды;
- [x] edit prefill загружается из immutable public detail и сверяется по `public_id`;
- [x] полный allowlist полей: display name, short name, RU/EN descriptions и HTTP(S) website;
- [x] `entity.revise` всегда отправляется с текущим `expected_entity_version`;
- [x] management ID хранится в `WeakMap`: не сериализуется, не выводится в DOM/URL/receipt;
- [x] mutations отключены при stale/unavailable/malformed snapshot, pending command/asset, отсутствии Discord/CSRF;
- [x] POST использует browser Origin, credentials и `X-CSRF-Token`; recent-auth rejection даёт re-login flow;
- [x] bounded polling только созданного command ID;
- [x] raw receipt/result/error/message не отображаются; разрешены только канонические status/error codes;
- [x] после принятого POST ошибка polling не разрешает повторную отправку потенциального дубля;
- [x] RU/EN и responsive форма;
- [x] полный `npm run ci`: 234/234 unit, 260 dist files, 727 references, 25 smoke.

### Остаток после F4b1

- [ ] F4b2: membership request/invite/resolve/leave/remove;
- [x] F4b3: team-club request/invite/resolve/detach;
- [ ] F4c: безопасная загрузка и moderation receipt логотипа;
- [ ] staging integration: recent-auth, CSRF/Origin, queue/receipt/state round-trip и version conflict;
- [ ] visual matrix desktop/tablet/mobile, RU/EN и keyboard — browser backend 01.08.2026 отсутствовал;
- [ ] production navigation/sitemap/CSP и deploy — отдельное решение.

## Завершённый контракт F4b2a — pending membership actions

- [x] backend actor-state добавляет только актуальные pending membership actions;
- [x] приглашение видит приглашённый пилот, запрос видит manager целевой сущности;
- [x] initiator видит собственную исходящую операцию как observer;
- [x] action snapshot не содержит внутренний target entity ID;
- [x] action ID на frontend хранится только в `WeakMap` и не сериализуется;
- [x] auth принимает старый actor-state из трёх полей и новый с `membership_actions`;
- [x] frontend также принимает оба формата и отключает mutations при malformed action;
- [x] массив ограничен 100 действиями на пилота, exact keys и allowlisted enums/dates;
- [x] database migration не требуется;
- [x] frontend CI: 235/235 unit, 260 dist files, 727 references, 25 smoke.

### Следующий срез F4b2b

- [ ] invitation/request cards и accept/reject UI;
- [ ] manager invite/remove и member leave UI;
- [ ] запрос вступления по public entity ID без раскрытия internal target ID;
- [ ] staging round-trip и visual matrix.

## Завершённый срез F4b2b1 — membership self-service

- [x] публичная карточка клуба/команды ведёт в кабинет с allowlisted public target ID;
- [x] auth принимает request только с exact payload `target_type + target_public_id`;
- [x] кабинет показывает pending invitation/request с названием и сроком действия;
- [x] subject invitation и manager request получают accept/reject;
- [x] обычный member может покинуть клуб/команду; leader/captain защищены transfer guard;
- [x] mutation guards, bounded polling и safe receipt остаются общими с F4b1;
- [x] RU/EN и mobile stacking добавлены;
- [x] frontend CI: 237/237 unit, 260 dist files, 727 references, 25 smoke;
- [ ] visual matrix не выполнена: browser runtime вернул пустой список backend'ов;
- [x] F4b2b2: manager invite/remove с безопасным поиском пилота;
- [ ] staging auth/backend round-trip и production deploy.

## Завершённый срез F4b2b2 — manager roster controls

- [x] manager открывает отдельное управление составом клуба/команды;
- [x] roster загружается только из immutable detail активного snapshot;
- [x] поиск использует существующий публичный `top-data/v2/drivers/drivers.json`;
- [x] индекс нормализуется до `publicId + displayName`, private/unknown fields отбрасываются;
- [x] минимум 2 символа, максимум 12 результатов, текущий roster исключён;
- [x] invite/remove payload собирается из protected manager entity ID и выбранного public pilot ID;
- [x] удалить можно только роль `member`; head/captain не получают кнопку;
- [x] auth exact allowlist проверяет все membership command payloads;
- [x] RU/EN, keyboard input и mobile vertical layout;
- [x] frontend CI: 241/241 unit, 261 dist files, 728 references, 25 smoke;
- [ ] visual matrix: browser runtime снова вернул пустой список backend'ов;
- [x] F4b3: team-club affiliation actions;
- [ ] staging auth/backend round-trip и production deploy.

## Завершённый контракт F4b3a — team-club pending state

- [x] backend snapshot сообщает public team/club metadata и resolution role;
- [x] internal action ID хранится frontend только в `WeakMap`;
- [x] старые actor-state snapshots остаются допустимыми;
- [x] malformed/oversized/duplicate actions fail closed и отключают mutations;
- [x] auth exact allowlist готов для request/invite/resolve/detach;
- [x] frontend CI: 242/242 unit, 261 dist files, 728 references, 25 smoke;
- [x] F4b3b: публичные CTA и кабинетные действия;
- [ ] staging round-trip и ручная visual matrix.

## Завершённый срез F4b3b — team-club affiliation UI

- [x] публичная страница клуба предлагает пригласить команду, а страница команды — запросить вступление или управлять связью;
- [x] кабинет допускает request только капитану команды и invite только главе клуба;
- [x] pending request/invite показывают обе стороны, срок действия и accept/reject только допустимому manager;
- [x] resolve использует защищённый action ID из `WeakMap`, без помещения внутреннего ID в DOM/URL;
- [x] detach доступен только главе клуба или капитану своей команды и требует отдельного подтверждения;
- [x] предупреждение явно сообщает, что detach архивирует команду и прекращает её операции;
- [x] payload собирается только через allowlisted command builders с public target ID;
- [x] RU/EN и mobile stacking добавлены;
- [x] frontend CI: 243/243 unit, 261 dist files, 728 references, 25 smoke;
- [ ] визуальная матрица не выполнена: browser runtime 01.08.2026 снова вернул пустой список backend'ов;
- [ ] Stage 6V: staging auth queue → backend apply → actor-state round-trip;
- [ ] F4c: безопасная загрузка и moderation receipt логотипа;
- [ ] production navigation/sitemap/CSP и deploy — отдельное решение после staging gate.
## Production Discord canary update — 11.08.2026

- [x] Existing URL role enabled only for approved UNITED RACING LEAGUE membership.
- [x] Independent Discord API verification: ASG Racing 11/11, Ford Power 2/2,
  UNITED RACING LEAGUE 1/1.
- [x] All three role mappings resolve to exactly one permissionless role; no
  duplicate role names were created.
- [x] Retry/backoff recovered from transient Discord network errors and the
  production queue drained to zero.
- [x] Manual drift test: removing the Ford Power role followed by an
  entity-scoped reconcile restored the role to 2/2 approved linked members.
- [x] Second team canary: Furry Femboys role created once with zero permissions,
  assigned 3/3, and retained the same role ID after repeated reconcile.
- [ ] Global enablement for every other approved club/team remains gated by a
  separate rollout decision.
## Global manager logo upload — production 13.08.2026

- [x] Removed the frontend driver-ID and entity-slug image canary.
- [x] Upload controls are available to every approved club head and team captain
  when the existing mutation guards are satisfied.
- [x] Members, pending entities, pending revisions, stale state and signed-out
  users remain fail-closed.
- [x] Production CDN serves the global-manager UI; full frontend verify passed
  with 259/259 unit tests.
