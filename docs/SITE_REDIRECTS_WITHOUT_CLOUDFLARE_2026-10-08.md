# Серверные перенаправления без Cloudflare

Выпуск `site-redirects-20261008-r2`, 8 октября 2026. Пользователь подтвердил отключение Cloudflare proxy и поручил восстановить HTTP 301.

## Результат и архитектура

Главный HTTP/HTTPS-вход находится на текущем VPS `200.165.229.139`. Только DNS-записи `asgracing.ru` и `www.asgracing.ru` переведены из CNAME GitHub в A VPS, TTL 300, `proxied=false`. Cloudflare остаётся DNS-провайдером; его прежние правила не удалены. Записи API, auth, data и donations сохранены.

Отдельные nginx-хосты выполняют серверные 301 и получают неизменённые публичные файлы с GitHub Pages. Исходники и публикация `top/main` продолжают работать как прежде; отправлять фронтенд на VPS при обычной правке сайта не требуется. В upstream используется TLS-имя `asgracing.github.io` и HTTP Host `asgracing.ru`: соединение не зависит от DNS главного сайта или продления его сертификата на GitHub. Проверка сертификатов включена. Cookie и Authorization не передаются в статический upstream; URL доступа не записываются новым хостом.

Карты генерируются из `scripts/root-redirects.mjs` и `scripts/edge-release-plan.mjs`. 287 старых путей: RU, V2, удалённый Preview, документы и алиасы. Ссылки `race_id` и `slug` преобразуются в детальные страницы с `id`, сохранением языка, порядка остальных параметров и повторяющихся UTM. Учтены приоритет существующего id, пустые значения, дубли и границы ключей. Старый интерфейс, ASG Lab, командная регистрация и API не подменяются новыми migration-правилами.

## Доставка и проверки

- Пакет: `tmp/site-nginx-release/site-redirects-20261008-r2.tar.gz`, SHA-256 `851681fe1cb09e7d3ebf996c98ce09b24f437a1dcaf0524d73b1026f15dbd25d`.
- VPS: `/opt/asg-site/releases/site-redirects-20261008-r2`; SHA-256 inventory проверен перед подготовкой.
- Scoped ссылки: `/etc/nginx/conf.d/asg-site-redirect-maps.conf`, `/etc/nginx/sites-available/asg-site-front`, `/etc/nginx/sites-enabled/asg-site-front`. Прежние vhost data/auth проверены по исходным хешам.
- Передача: SCP 18 000 Кбит/с с общим cross-process слотом. Запись итогового журнала использует общий paced stdin transport с тем же лимитом.
- 661 сценарий прошёл на отдельном loopback nginx, 6 локальных JS-тестов и 4 Python-теста проверили контракт, границы изменения DNS, откат и оба способа лимитированной передачи. `npm run verify` прошёл, 375 тестов.
- Публичная проверка подготовленного входа: 12 страниц/ресурсов совпали побайтово с GitHub, в том числе legal.js, CSS/JS и рекламные баннеры; 10 проверок 301/canonical прошли, неизвестный путь сохранил HTTP 404. Запрет отображения во фрейме не добавлен.
- После DNS-переключения обычные публичные запросы получают сайт с VPS: главная 200, `/ru/` → `/`, `/v2/en/` → `/en/`, `/preview/ru/` → `/`, legacy race_id → id — 301. robots/sitemap доступны. www и HTTP переходят на HTTPS корня.
- Auth health и публичный data manifest исправны. При проверках не исполнялся JS, не отправлялись события Метрики, записи на гонку, portal-команды или сообщения.

Первый кандидат r1 автоматически откатил новый nginx-хост после слишком ранней TLS-проверки во время graceful reload. В r2 предусмотрено ограниченное ожидание готовности workers; TLS-проверка не ослабляется. Публичный DNS во время этой ошибки оставался на GitHub.

## TLS и эксплуатация

Сертификат Let's Encrypt для root/www действует до 6 января 2027. Bootstrap использовал временные DNS TXT, удалённые после выпуска; токен Cloudflare не переносился на VPS. `certbot reconfigure` успешно проверил будущую HTTP/webroot-валидацию и сохранил автоматическое продление через `/var/www/asg-site-acme` и deploy hook `nginx -t && systemctl reload nginx`. Существующий certbot.timer включён. Конфигурация сертификатов auth/data не менялась.

Журнал VPS: `/opt/asg-site/deployment-journal/site-redirects-20261008-r2.json`. DNS backup и итоговые HTTP-проверки находятся в workspace `tmp/site-nginx-release`. Подтверждение доступности в браузере на компьютере МТС получено от пользователя; присланная попытка CLI содержала вставленную стенограмму, поэтому не считается отдельным тестом принудительного доступа к VPS.

## Откат

Из canonical `top` на компьютере разработки:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/site-nginx-release/control.ps1 -Action rollback -Version site-redirects-20261008-r2
```

Команда проверяет идентичность записей и возвращает ровно два исходных CNAME GitHub с DNS-only. При чужом изменении DNS останавливается. Новые nginx-хосты остаются доступны посетителям со старым DNS-кэшем; отключать их можно только после истечения кэшей и проверки возврата трафика на GitHub. Сертификаты и runtime-данные не удаляются. Никакие Python-службы или ACC-инстансы не останавливаются.

Полная инструкция подготовки содержится в исходниках генератора и `scripts/site-nginx-release`: generate → package → shared capped transfer → prepare acceptance → issue TLS → activate nginx → verify public → cutover → configure renewal → finalize. При будущей замене активного nginx-релиза следует отдельно подготовить транзакционное обновление собственных ссылок; initial installer отказывается перезаписывать существующую конфигурацию.
