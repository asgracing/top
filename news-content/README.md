# News Content

This folder is the source of truth for main-site news and notifications.

Current frontend behavior:
- Reads `./news-content/news.json` directly from the site repository
- Does not depend on `/top-data/news.json`

Recommended structure:
- `news.json` for records
- `images/<slug>/thumb.*` for bell/modal thumbnails
- `images/<slug>/cover.*` for full article covers

Suggested JSON fields per item:
- `id`
- `slug`
- `title`
- `summary`
- `body`
- `thumbnail_url`
- `cover_image_url`
- `image_alt`
- `published_at`
- `expires_at`
- `kind`
- `priority`
- `is_pinned`

The frontend does not auto-translate article content. Titles and body text are rendered exactly as written in JSON.
