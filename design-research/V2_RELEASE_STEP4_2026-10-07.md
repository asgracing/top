# V2: подготовка публикации и отката

07.10.2026. Выполнено локально. Активации исходного checkout, staging, коммита, push, изменения Pages/Cloudflare и публикации не было.

## Подтверждённая доставка

Канонический репозиторий `top`, ветка `main`, remote `asgracing/top.git`; после fetch HEAD и origin/main совпадают: `211c939cb708d3d010ac4ecd7a5ab961ec011760`.

У этой ревизии успешно завершены два разных workflow: проверка `Top quality and deployment artifact` и динамический `pages build and deployment`. Последний содержит Checkout → Build with Jekyll → Upload artifact → Deploy to GitHub Pages. Deployment `6908081130`, run `37609365506` выдал `https://asgracing.ru/`. Байт-в-байт совпали production `/`, `/ru/index.html`, `/v2/ru/index.html` и `/app.js` с этой Git-ревизией. `CNAME` — конфигурационный файл Pages, его публичный URL возвращает 404; это не ошибка изображения или страницы.

Используется подтверждённый пользователем путь `top/main` → branch Pages. Workflow качества сохраняет dist, но **не доставляет его вместо содержимого ветки**. Подготовка поэтому включает материализацию проверенного payload в `top` перед отдельным согласованным commit/push; смены hosting-механизма нет.

Pages settings API возвращает 404, загрузка build logs — 403 с требованием repository admin. Job/status metadata доступны и достаточны для приведённых наблюдений. Административные настройки и их изменение не проверены. При публикации проверить deployment того же commit; успешный quality artifact сам по себе не подтверждает выдачу сайта.

В текущем механизме branch Pages и quality CI запускаются отдельно. Качество не является серверным блокировщиком Pages. Поэтому полный локальный gate на точном согласованном составе обязателен **до push**. Переход на Actions deployment с обязательным quality gate потребует доступа к настройкам Pages и отдельного решения; в этом шаге такой переход не выполнялся.

## Механизм сборки

- `site-release.json` выбирает `parallel`, `root` или `root-fallback`. Сейчас в рабочем checkout остаётся `parallel`.
- `npm run build` выбирает соответствующую сборку. После root активации она не вызывает проверку третьего интерфейса Preview.
- `npm run ci` в root режиме сохраняет синтаксис, unit, DOM-проверки поддерживаемого V1, V2 source-only reproducibility, бюджеты, сборку, hash/reference/SEO и HTTP smoke. Проверка `check-published-root` сравнивает 555 runtime-файлов публикации с новой сборкой из источников.
- Классические DOM/SEO-проверки читают поддерживаемые V1 templates и legacy sitemap, а не новые страницы, уже занявшие их адреса.
- Прямая генерация старого localized HTML в root после активации запрещена до первой записи. V2 компилируется отдельно от опубликованных `/v2/` aliases, поэтому повторные проверки не превращают aliases обратно в третьи публичные страницы.
- В root unit pipeline не загружаются только два набора тестов удалённого третьего интерфейса: `preview-presentation` и `preview-routes`. Новая карта retired URL и действующие переходы проверяются `root-redirects`/`site-routing` и браузером. Остальные тесты сохранены.
- `_config.yml` в подготовленном payload исключает Preview, исходные templates, scripts/tests, дизайн-исследования, package/config и остальные непубличные верхние каталоги из Jekyll. Рабочие исходники сохраняются в Git; удаление публичной версии не означает удаления поддерживаемых V1 inputs.

## Подготовленный пакет

Версия `2026-10-07T20-20-35-779Z-c20d446bb33d` находится в workspace:

`tmp/site-releases/2026-10-07T20-20-35-779Z-c20d446bb33d/`

Состав: `candidate/`, `fallback/`, два пофайловых плана, sealed SHA-256 inventory, карта 287 редиректов/CSV и резервный Git archive предыдущей production ревизии. Inventory содержит 1128 записей. Это локальный пакет, не опубликованный artifact.

План candidate: 224 явных записи и 221 удаление файлов **только** публичного `preview/`. План fallback: 61 запись, без удаления. Для каждого режима проверяются все 561 исходные позиции payload: последующая правка даже неизменяемого файла требует переподготовки. Проверяются целевые пути, symlinks/junctions, исходные hash и integrity всего пакета. Материализатор сначала сохраняет before inventory, восстанавливает применённые файлы при ошибке, не вызывает Git и не копирует runtime игровых серверов/backend.

Резервная копия `previous-production-source.zip`, 132702377 bytes, содержит Git source ревизии `211c939cb708d3d010ac4ecd7a5ab961ec011760`; SHA-256 `1d9e57d9254caf1be1abd37321f5ddfa97b1dfe77715b096343a30b38eec1a73`. Это source backup, а не экспорт Cloudflare и не доказательство сохранения настроек аналитических кабинетов. Результаты HTTP сравнения записаны отдельно в `tmp/v2-step4-production-baseline.json`.

## Активация и откат

Команды ниже описывают подготовленный механизм. В настоящем `top` они **не запускались**.

После приёмки кандидата, повторного fetch/diff и подтверждения неизменности scope:

```powershell
node scripts/materialize-site-release.mjs --bundle C:/Python/asgracing/tmp/site-releases/2026-10-07T20-20-35-779Z-c20d446bb33d --activate-source --apply
npm.cmd run ci
```

Далее explicit-file staging, проверка полного outgoing диапазона, release commit и push при пользовательской команде публикации. Материализатор сам ничего не stage/commit/push. Empty Preview directories не входят в Git; gate проверяет отсутствие файлов.

Если HTTP редиректы ещё не закреплены, допустим обычный проверенный revert конкретного release commit. После закрепления редиректов полное восстановление прежней EN-root/RU-prefix схемы может создать петли. Подготовлен адресно совместимый fallback: прежний интерфейс работает **по новым `/` RU и `/en/` EN адресам**, `/old/` и aliases остаются доступными; query гонки/новости переводится в формат native контроллеров, документы открывают действующий текст.

Локальная подготовка этого fallback для нового отдельного rollback commit выполняется одной командой:

```powershell
node scripts/materialize-site-release.mjs --bundle C:/Python/asgracing/tmp/site-releases/2026-10-07T20-20-35-779Z-c20d446bb33d --fallback --activate-source --apply
```

Затем обязательны CI, явный commit/push и проверка доставки как для обычного site release. Это не force push и не автоматический удалённый откат. Если после релиза появились другие правки, hash gate остановит применение; fallback нужно пересобрать с сохранением этих правок. Отдельный экспорт/rollback edge-config предстоит подготовить перед включением правил. Уже закэшированные 301 нельзя отменить только удалением правила.

## Проверки

- Текущий parallel source: полный `npm run ci`, 371 unit tests, 671 dist-файл, 5843 локальные ссылки, 35 HTTP/range smoke-проверок.
- Репетиция candidate → root CI → запрет старого SEO generator → fallback → build в отдельном source/test каталоге без `.git`; реальный `top` не активирован. Root pipeline не зависит от удалённого Preview.
- Candidate и fallback: по 58 RU/EN страниц, 34 sitemap URL, 287 конечных redirect targets, проверка сохранения Метрики/Search Console, references/hash и отсутствие Preview в публичном payload.
- Браузер V2/old: 24 проверки переходов, query/hash, direct race, профиля и единственного consent-dependent init Метрики.
- Браузер fallback: 28 RU/EN экранов, native read-only access gates, прямые результаты гонки, настоящий текст обеих политик; JS errors не обнаружены. Все внешние запросы перехвачены, реальные записи/команды/события аналитики не отправлялись.

Отчёты: `tmp/v2-step4-ci.log`, `v2-step4-rehearsal-final.log`, `v2-step4-rehearsal.json`, `v2-step4-root-browser.log`, `v2-step4-fallback-browser.json`; bundle содержит свой inventory и пофайловые планы.

Для просмотра: V2 RU `http://127.0.0.1:8851/`, EN `/en/`, старый сайт `/old/`; подготовленный fallback `http://127.0.0.1:8852/` и `/en/`. Эти серверы работают локально с GET-only proxy; в production этот proxy/shim не включается.

## Следующий шаг

Подготовить и проверить настоящие edge HTTP redirects: доступ к текущей зоне, фактический proxy/лимиты, backup конфигурации, query-specific правила и проверка rollback. Затем уточнить действующее GA4/GTM подключение, цели Метрики и реальный Steam return в read-only режиме. Эти проверки не требуют доработки backend. После внешних проверок предоставить окончательный revision/candidate для согласования и выполнять публикацию по явной команде пользователя.
