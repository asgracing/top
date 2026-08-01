# Clubs & Teams frontend handoff — Stage F4b1

Дата: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production, auth VPS и backend не изменялись; push/deploy не выполнялись.

## Результат

В `/account/` добавлены формы создания и редактирования клуба/команды через уже существующий
`POST https://auth.asgracing.ru/v1/clubs-teams/commands`.

Создание формирует только `club.create` или `team.create`. Редактирование формирует только
`entity.revise` и всегда включает `expected_entity_version`. Отправленная команда опрашивается через
scoped endpoint `/v1/clubs-teams/commands/{command_id}`; кабинет затем обновляет `/v1/me`.

## Защита данных и существующего функционала

- mutation controls включаются только для fresh, available и structurally valid actor snapshot;
- нужна привязка Discord, CSRF token и отсутствие другой pending operation;
- revise доступен только head/captain и только без pending revision;
- approved public detail загружается перед revise, чтобы непоказанные поля не были затёрты;
- detail связан с immutable `rating_run_id`, slug и exact public ID;
- actor/entity snapshots требуют точных канонических ключей;
- internal management IDs хранятся только в `WeakMap` и не сериализуются;
- имя/короткое имя/описания/website нормализуются с backend-compatible bounds;
- website принимает только HTTP(S) без credentials;
- raw receipt fields, signature, result, error message и неизвестные error codes отбрасываются;
- после принятого POST ошибка polling трактуется как queued, поэтому UI не провоцирует дубликат;
- race-number, Discord и read-only F4a flows не изменены.

Origin устанавливается браузером; frontend дополнительно отправляет credentials и `X-CSRF-Token`.
Backend продолжает независимо проверять recent auth, driver eligibility, Discord link, actor role и version.

## Проверки

- `npm run ci` — успешно;
- unit: 234/234;
- dist: 260 файлов;
- references: 727;
- smoke: 25;
- performance budgets пройдены; главный `app.js` не вырос и blocking scripts остались 0;
- новые syntax checks включены в штатный `check:syntax`.

## Visual и integration gates

Встроенная браузерная среда снова не предоставила backend. Открыта матрица 1440×900, 1052×1577,
390×844; RU/EN; create/edit; stale/disabled/pending/recent-auth/name-taken/version-conflict.

Live POST не выполнялся: этот checkpoint не должен создавать реальные клубы/команды. Полный
auth → queue → вручную перенесённый backend → receipt/state round-trip остаётся staging-проверкой.

## Следующий этап

F4b2 — membership request/invite/resolve/leave/remove как отдельный command-model и UI checkpoint.
Team-club flows и asset upload остаются следующими независимыми этапами.
