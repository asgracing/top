# Clubs & Teams frontend — handoff после Stage F1

Дата: 29.07.2026

Репозиторий: `C:\Python\asgracing\top-clubs-teams-v1`

Ветка: `feature/clubs-teams-v1`

Checkpoint перед Stage F1: `6161e88b`

Backend checkpoint: `28774cb`

Auth checkpoint: `8b71c80`

## Реализовано

- новый изолированный публичный маршрут `/teams/?tab=clubs|teams`;
- production data base:
  `https://data.asgracing.ru/public-cache-clubs-teams`;
- local override `clubsTeamsDataBase` разрешён только на localhost;
- current pointer и catalog pages проходят строгую allowlist validation;
- loader запрашивает все backend pages и отклоняет неполные, дублированные или
  смешанные snapshots;
- asset URL обязан точно совпасть с content hash и активным snapshot;
- карточки не используют `innerHTML`;
- добавлены RU/EN, search, states и responsive 3/2/1 grid;
- маршрут включён в dist allowlist, checksum manifest и smoke test;
- существующие страницы, sitemap и общая навигация намеренно не переключались.

## Проверки

- полный `npm run ci` успешно;
- 220/220 unit tests успешно;
- site quality успешно;
- performance budgets успешно;
- dist manifest и 655 local references успешно;
- smoke: 16 routes/assets и video range успешно;
- реальная HTTP-загрузка fixture: 3 клуба и 4 команды;
- встроенный браузер недоступен в текущей сессии, поэтому visual screenshot
  matrix не заявляется пройденной.

## Production state

Production не изменялся. Push и deploy не выполнялись. Реальный public snapshot
не запрашивался, auth mutations не вызывались.

## Следующий этап — Stage F2

Реализовать публичные detail routes клубов и команд, затем связать catalog cards
с ними. До visual matrix и отдельного решения пользователя не добавлять новый
раздел в production navigation и sitemap.
