# Clubs & Teams frontend backlog

Дата актуализации: 29.07.2026

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

## Следующий срез F2

1. `/clubs/{slug}` — публичная карточка клуба.
2. `/teams/{slug}` — публичная карточка команды.
3. Roster, описание RU/EN, website, recent races и rating из detail snapshot.
4. Переходы из catalog cards только после готовности обоих detail routes.
5. Затем добавить ссылку на каталог в существующую общую навигацию.

## После F2

1. General / Hourly / Championship rating representations.
2. Личный кабинет через `auth.asgracing.ru`.
3. Pending receipts, создание/редактирование, приглашения и membership.
4. Безопасная загрузка изображения через уже готовый auth/backend pipeline.
5. Visual/accessibility checkpoint, затем отдельное решение о production.
