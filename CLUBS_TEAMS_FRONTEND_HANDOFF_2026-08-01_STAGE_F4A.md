# Clubs & Teams frontend handoff — Stage F4a

Дата: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production не изменялся; push/deploy не выполнялись.

## Результат

В существующий `/account/` добавлен изолированный read-only блок «Клубы и команды». Он использует
уже выполняемый запрос `GET https://auth.asgracing.ru/v1/me`, поэтому новый сетевой маршрут и новая
авторизационная поверхность не появились.

Показываются текущий клуб/команда, роль и подтверждённый статус, ожидающая revision, число операций
в очереди и последние безопасные статусы. Есть переходы в публичный каталог и профили.

## Граница безопасности

- входной `clubs_teams` проходит отдельную строгую модель;
- неизвестные статусы, роли, slug, версии и malformed entities отклоняются;
- внутренний `id`, actor state extras, receipt `signature/key_id`, `result` и `error` не сохраняются;
- массивы операций ограничены 20 элементами в модели и 5 элементами в интерфейсе;
- при disabled или stale/unavailable snapshot интерфейс явно предупреждает пользователя;
- F4a не отправляет mutations и не меняет CSRF/recent-auth поведение существующего кабинета.

## Проверки

- `npm run ci` — успешно;
- unit: 230/230;
- dist: 259 файлов;
- local references: 722;
- smoke: 25 маршрутов/assets и video byte-range;
- performance budgets пройдены; `app.js` остался 451147 байт, 0 blocking scripts;
- отдельные security tests подтверждают удаление внутренних ID и произвольного receipt content.

## Visual checkpoint

Встроенная браузерная среда 01.08.2026 не предоставила ни одного backend (`[]`). Внешний Playwright
не использовался в соответствии с правилами Browser skill. Открыты проверки `/account/` для
1440×900, 1052×1577 и 390×844, RU/EN, а также disabled/stale/empty/club+team/pending states.

## Следующий этап

F4b — mutation UI небольшими независимыми срезами. Сначала create/revise с allowlisted payload,
fresh snapshot, expected entity version, Origin/CSRF/recent-auth guards и polling; затем membership и
team-club flows. Asset upload остаётся отдельным F4c.
