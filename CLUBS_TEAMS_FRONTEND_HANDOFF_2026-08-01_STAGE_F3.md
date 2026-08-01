# Clubs & Teams frontend handoff — Stage F3

Дата: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production: без изменений; push/deploy не выполнялись.

## Реализовано

- General / Hourly / Championship rating contexts из изолированного public
  snapshot;
- полный контекстный каталог:
  `/teams/?context={general|hourly|championship}&tab={clubs|teams}`;
- компактный Hourly standings embed в `/hourly/`;
- компактный Championship standings embed в `/hourly/championship/`;
- переход из общего рейтинга главной в General-зачёт клубов и команд;
- переключение Clubs/Teams, top-5 и переход в полный зачёт;
- единый reusable loader и renderer без изменений существующих больших
  `app.js` Hourly/Championship;
- RU/EN, loading/empty/error, keyboard controls и mobile layout;
- request sequencing: запоздавший ответ старого context не заменяет новый;
- fixtures всех трёх contexts.

## Контракт безопасности

Frontend принимает только `clubs_teams_rating_page` с:

- allowlisted context `general|hourly|championship`;
- `season_id: null`;
- точным entity type и active `rating_run_id`;
- согласованными page/offset/limit/total_pages;
- положительным context version;
- SHA-256-форматом entries digest;
- уже действующей строгой проверкой entries, assets и snapshot URL.

Произвольный context из query нормализуется в `general`; построить путь через
`../` или запросить season через этот loader нельзя.

## Проверки

- `npm run ci` — успешно;
- unit: 227/227;
- dist: 258 файлов;
- local references: 721;
- smoke: 25 маршрутов/assets и video byte-range;
- budgets: пройдены; главная сохранила 0 blocking scripts и 32 stylesheet
  requests, новые rating-файлы подключены только на целевых страницах.

## Visual checkpoint

Встроенный browser backend снова отсутствовал. Browser skill не разрешает
подменять проверку внешним Playwright, поэтому visual matrix остаётся открытой:

1. `/teams/` — 3 contexts × 2 entity tabs;
2. `/hourly/` — embed не ломает двухколоночный hero и занимает всю ширину ниже
   календаря;
3. `/hourly/championship/` — embed между driver standings и archive;
4. viewport 1440×900, 1052×1577, 390×844; RU/EN; keyboard;
5. loading/error/empty и отсутствие horizontal overflow.

## Осознанные ограничения

- main page получила безопасный переход в отдельный General-зачёт, а не новую
  вкладку внутри монолитной driver table;
- season-specific championship standings пока не подключены;
- detail pages продолжают показывать General rating;
- production navigation, sitemap и deploy не менялись.

## Следующий этап

F4 — личный кабинет и mutations через `auth.asgracing.ru`: receipts,
создание/редактирование, приглашения, membership и asset upload.
