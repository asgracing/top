# Clubs & Teams frontend handoff — Stage F2

Дата: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production: без изменений; push/deploy не выполнялись.

## Реализовано

- публичный профиль клуба: `/clubs/?slug={slug}`;
- публичный профиль команды: `/teams/detail/?slug={slug}`;
- resolver также понимает `/clubs/{slug}` и `/teams/{slug}` для будущего
  reverse-proxy rewrite;
- переходы из `/teams/?tab=clubs|teams` и между связанными сущностями;
- RU/EN описание, website, рейтинг, roster, связанный клуб/команды и последние
  зачётные гонки;
- безопасный DOM без динамического HTML;
- detail загружается только из активного immutable snapshot:
  `snapshots/{rating_run_id}/details/{clubs|teams}/{slug}.json`;
- schema, identity, status, active run, роли, дубликаты, website и asset URL
  проходят строгую клиентскую проверку;
- desktop/tablet/mobile responsive CSS;
- fixture клуба и команды и unit regression tests.

## Проверки

- `npm run ci` — успешно;
- unit: 224/224;
- dist: 253 файла проверены;
- local references: 706;
- smoke: 20 маршрутов/assets и video byte-range;
- performance budgets: пройдены; увеличены только aggregate budgets для нового
  изолированного detail JS/CSS, бюджеты главной страницы и media не менялись.

## Не проверено визуально

Встроенный browser backend отсутствовал (`agent.browsers.list()` вернул пустой
список), поэтому визуальная матрица не отмечена выполненной. Самостоятельная
подмена Browser skill внешним Playwright не использовалась.

Минимальная следующая visual matrix:

1. `/teams/?tab=clubs` → карточка клуба → профиль клуба;
2. профиль клуба → связанная команда → профиль команды;
3. EN и RU;
4. viewport 1440×900, 1052×1577 и 390×844;
5. loading/error/empty, keyboard focus и отсутствие horizontal overflow.

## Осознанные ограничения

GitHub Pages не выполняет wildcard rewrite. Поэтому F2 использует рабочие
статические entry points с `?slug=`. Красивые URL уже поддерживаются resolver,
но начнут реально открываться только после настройки reverse proxy или генерации
отдельного `index.html` для каждого slug.

Глобальная production-навигация и sitemap не изменены до visual checkpoint и
отдельного решения о публикации.

## Следующий этап

F3: представления рейтинга General / Hourly / Championship. После этого —
личный кабинет и операции создания/редактирования/участия через
`auth.asgracing.ru`.
