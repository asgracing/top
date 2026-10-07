# Read-only доступ для проверки V2

Wrangler вход обновлён пользователем 08.10.2026 и успешно сохранён. Он позволяет получить список зон, но DNS/Page Rules/Single/Bulk/cache/zone settings/lists вернули 403. Вход работает; его OAuth permissions не подходят для полного edge backup. Повторный login тем же Wrangler набором не исправляет этот недостаток. Production не менялся.

**Настройка выполнена 08.10.2026:** пользователь создал Read token, сохранил через helper; реальный audit завершился `read-backup-complete`, settingsChanged false, 10 файлов. Их SHA-256 проверены агентом. Backup: workspace `tmp/v2-edge-backups/2026-10-07T21-27-10-276241+00-00/`. Дальнейшие команды ниже остаются инструкцией повторного аудита; заново создавать токен сейчас не нужно.

## Настройка владельцем

1. Открыть [My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Create Custom Token.
2. Название: `ASG V2 read audit`. Выбрать права ниже, все **Read**, без Edit/Write:

| Уровень | Разрешение |
| --- | --- |
| Zone | Zone |
| Zone | DNS |
| Zone | Zone Settings |
| Zone | Page Rules |
| Zone | Single Redirect |
| Zone | Cache Rules |
| Account | Bulk URL Redirects |
| Account | Account Filter Lists |

3. Zone Resources: Include → Specific zone → `asgracing.ru`. Account Resources: Include → Specific account → аккаунт, содержащий этот домен. Ограничить срок, например 7 дней: доступ нужен для подготовки текущего релиза. Если UI использует старые названия, Single Redirect соответствует Dynamic URL Redirects, Bulk URL Redirects — Mass URL Redirects, Cache Rules — Cache Settings.
4. Проверить итоговые Read permissions, создать токен и скопировать его. Не присылать в чат, не помещать в исходники/команды/логи.
5. На этом компьютере запустить PowerShell-команду:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File C:\Python\asgracing\top\scripts\audit-cloudflare.ps1 -SaveToken
```

Вставить токен только в появившийся скрытый prompt. Helper хранит его в Windows DPAPI-зашифрованном виде вне site repository, в `portal-secrets/cloudflare-read-token.dpapi`. Это не общий переносимый секрет; расшифровка привязана к Windows-пользователю/компьютеру. Audit получает токен только через process environment, выполняет GET и сохраняет конфигурацию в workspace tmp, без изменения настроек Cloudflare.

После сохранения повторная проверка агентом/оператором:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File C:\Python\asgracing\top\scripts\audit-cloudflare.ps1
```

При 403 запись backup помечается incomplete; это не означает, что правил нет. Все недоступные counts обозначаются null. Для применения будущих правил потребуются отдельные согласованные write permissions или ручная работа владельца; этот токен предназначен только для проверки и резервной копии.

`RemoteSigned` задаётся только для этого процесса PowerShell: глобальная политика Windows не меняется. Это позволяет запустить созданный локально helper при стандартном запрете .ps1. Права сверены с [официальным справочником Cloudflare](https://developers.cloudflare.com/fundamentals/api/reference/permissions/). Реальный запуск helper с настоящим read токеном пока не выполнялся; нужна его настройка владельцем. Ранее получен только частичный backup: `tmp/v2-edge-backups/2026-10-07T21-15-02-772252+00-00/`, без DNS/rules/SSL; не использовать его для полного rollback.
