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

## Следующий срез F3

1. General / Hourly / Championship rating representations.
2. Личный кабинет через `auth.asgracing.ru`.
3. Pending receipts, создание/редактирование, приглашения и membership.
4. Безопасная загрузка изображения через уже готовый auth/backend pipeline.
5. Visual/accessibility checkpoint, затем отдельное решение о production.
