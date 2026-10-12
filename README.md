# LAZUR — PreProduction (статичен сайт)

Този проект е статичен landing page (без build стъпка):

- `index.html` — основна страница (SEO тагове + JSON-LD + секции)
- `style.css` — стилове
- `main.js` — интеракции (меню, reveal, lazy bg, форма)
- `404.html` — 404 страница
- `robots.txt`, `sitemap.xml` — базови SEO файлове
- `_headers` — security headers за Cloudflare Pages

## Качване в Cloudflare Pages (без Git)

1. Cloudflare Dashboard → **Workers & Pages** → **Pages** → **Create a project**
2. Избери **Direct upload**
3. Качи съдържанието на папката `PreProduction` (файловете да са в root на проекта)
4. Настройки:
   - **Framework preset**: `None`
   - **Build command**: празно
   - **Build output directory**: `/` (root)

## Какво трябва да се попълни след качване

### 1) Реален домейн (важно за SEO)

В `index.html` има мета тагове, които в момента сочат към примерен домейн (`https://lazur-trips.com/`).
След като имаш реалния URL (Cloudflare Pages URL или custom domain), смени:

- `<link rel="canonical" ...>`
- `<link rel="alternate" hreflang=...>`
- `og:url`

В `sitemap.xml` смени `<loc>`.

`robots.txt` е настроен със **relative** `Sitemap: /sitemap.xml`.

### 2) Контактна форма — Cloudflare Pages Function + Resend

Формата вече не използва Formspree. Пуска POST заявка към `/api/contact`,
което е Cloudflare Pages Function (`functions/api/contact.js`) и изпраща
имейла през [Resend](https://resend.com).

За да заработи след качване в Cloudflare Pages:

1. Направи си безплатен акаунт в **resend.com**.
2. Добави и верифицирай реалния домейн на сайта в Resend (дава ти DNS записи —
   слагат се в Cloudflare DNS за същия домейн).
3. Вземи **API key** от Resend.
4. В Cloudflare Pages → проекта → **Settings → Environment variables** добави:
   - `RESEND_API_KEY` — **Secret**, стойността от Resend
   - `CONTACT_TO_EMAIL` — **Var**, реалният имейл, на който да идват запитванията (напр. `contact@rokko.bg`)
   - `CONTACT_FROM_EMAIL` — **Var**, верифициран изпращач в Resend (напр. `website@ТВОЯ-ДОМЕЙН`)
5. При **Direct upload** — папката `functions/` трябва да е в root-а на качваното съдържание заедно с `index.html`, за да я разпознае Cloudflare като Function.

## Направени корекции (в този чат)

- Уеднаквен брандинг в навигацията: **LAZUR**.
- Поправен JSON-LD:
  - премахнат дублиран `@context`
  - премахнати placeholder полета (`logo.png`, примерни телефон/имейл/адрес), за да не вредят на валидността.
- Добавен fallback при липса на `IntersectionObserver`, за да не остава съдържание скрито.
- `robots.txt`: sitemap линкът е направен относителен (`/sitemap.xml`).

## Препоръчани следващи подобрения (SEO + usability)

- Добави локална `og:image` (1200×630) вместо външен URL.
- Добави responsive изображения (`srcset`/`sizes`) за hero и секционните снимки.
- Добави “Skip to content” линк и `prefers-reduced-motion` стилове (accessibility).

