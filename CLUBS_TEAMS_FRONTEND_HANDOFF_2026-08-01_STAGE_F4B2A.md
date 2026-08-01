# Clubs & Teams frontend handoff — Stage F4b2a

Дата: 01.08.2026

Ветка: `feature/clubs-teams-v1`

Production не изменялся. Этот checkpoint добавляет только frontend-normalization нового actor-state;
membership mutations и новый UI пока не включены.

## Контракт

`clubs_teams.applied_state` принимает оба формата:

- legacy: `public_id`, `club`, `team`;
- extended: те же поля плюс `membership_actions`.

Каждое действие проходит exact-key validation, enum validation, проверку публичных ID/slug, дат и
связи `expires_at > created_at`. Максимум — 100 действий.

В модели остаются public target identity, display name, subject/initiator, тип и resolution role.
Внутренний action ID помещается в `WeakMap`, не сериализуется и не выводится.

## Проверки

- frontend `npm run ci` — успешно;
- unit: 235/235;
- dist: 260;
- references: 727;
- smoke: 25;
- malformed action делает actor state нецелостным и блокирует mutation controls.

## Следующий этап

F4b2b — карточки pending actions и команды resolve/invite/leave/remove. Для `membership.request`
нужен отдельный backend command contract по public entity ID, чтобы не публиковать internal target ID.
