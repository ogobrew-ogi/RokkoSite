# ROKKO / LAZUR Day Trips — Анализ на сайта и задачи

Дата на анализа: 2026-10-12
Статичен сайт (без build стъпка), хостван в Cloudflare Pages. Директория: `PROJECT_ROKO_SITE` (не е git repo в момента).

## 1. Текущо състояние на сайта

### Структура
- `index.html` (EN, начална страница по подразбиране) / `index-bg.html` (BG)
- `excursions.html` (EN) / `excursions-bg.html` (BG)
- `privacy-policy.html`, `terms.html` — активните правни страници
- `privacy.html`, `cookies.html` — **орфани**, вече не са линкнати от навигацията/футъра никъде
- `functions/api/contact.js` — Cloudflare Pages Function, изпраща контактната форма през Resend
- `_headers` — security headers (CSP, HSTS, X-Frame-Options и т.н.) — изглеждат коректно зададени
- `images/1.avif`/`.webp`/`.jpg`…`16.*` — реални снимки за екскурзии 1–5 (готови, в 3 формата от 2026-10-12)
- `images/17.svg`…`34.svg` — **placeholder SVG-та** за екскурзии 06–11 (все още не са заменени с реални снимки)
- `tools/build-images.mjs` + `images/source/` — автоматичен image pipeline (виж секция 3 по-долу)

### Какво работи
- EN е начална страница по подразбиране, BG е вторична (превключва се с toggle) — направено по изричното желание на потребителя за международен/платен трафик.
- Hreflang / canonical / og:url / JSON-LD синхронизирани между EN/BG версиите.
- `srcset` бъг е оправен (сочеше към несъществуващи `-400/-480/-960.webp` варианти).
- Контактната форма вече използва `action="/api/contact"` → собствена Cloudflare Function с Resend вместо Formspree. Кодът в `functions/api/contact.js` коректно валидира вход, има honeypot anti-spam поле и връща ясни JSON грешки.

### Какво НЕ работи / е недовършено

| # | Проблем | Къде | Сериозност |
|---|---|---|---|
| 1 | Контактната форма **не изпраща реално имейли** — няма зададени `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` в Cloudflare Pages env | `functions/api/contact.js` | Блокиращ |
| 2 | Телефон и имейл са placeholder-и навсякъде (`+359000000000`, `[PLACEHOLDER — +359 88 ...]`) | `index.html`, `index-bg.html`, `excursions.html`, `excursions-bg.html` | Блокиращ |
| 3 | Домейнът е още placeholder `lazur-trips.com` — в canonical/hreflang/og/sitemap | всички HTML + `sitemap.xml` | Блокиращ (SEO/метаданни ще сочат към грешен домейн при launch) |
| 4 | Екскурзии 06–11 са **само placeholder текст и SVG снимки** — 94 PLACEHOLDER низа в `excursions.html`, 89 в `excursions-bg.html` (имена, цени, описания, снимки, duration/transport/included) | `excursions.html`, `excursions-bg.html`, `images/17–34.svg` | Блокиращ за тези 6 екскурзии (1-5 са готови) |
| 5 | `privacy.html` и `cookies.html` са орфани — вече не се линкват от никъде освен от самите себе си, и имат счупен redirect към несъществуващ `index-en.html` | `privacy.html`, `cookies.html` | Косметичен — решение чака потребителя (delete или fix) |
| 6 | `privacy-policy.html` и `terms.html` имат мъртъв inline redirect към несъществуващи `-en` версии (`privacy-policy-en.html`, `terms-en.html`) | `privacy-policy.html`, `terms.html` | Дребен бъг |

### Проверено и потвърдено точно сега (не само от стара памет)
Горните точки 2–6 са прегледани наживо в текущите файлове на 2026-10-12 — не са остарели данни.

## 2. Какво направихме в тази сесия (тунелиране)

- Стартирахме локален `python -m http.server` + Cloudflare Quick Tunnel, за да може сайтът да се разгледа отвън.
- Открихме, че първият тунел по грешка сочеше към **чужд, вече работещ процес на порт 8080** (друг проект — "Siapartments"), не към ROKKO сайта.
- Коригирано: нов сървър на порт `8099` + нов тунел, потвърден чрез `curl`, че реално връща ROKKO/LAZUR HTML.
- Текущ работещ тунел (временен, docker/trycloudflare линк, пада при рестарт): **https://seq-ben-flying-ist.trycloudflare.com**
- Старите заседнали процеси (PID 19864 python, PID 7208 cloudflared от първия грешен опит) останаха непокоснати по изрично желание на потребителя — не пречат, просто висят неизползвани.

## 3. Image pipeline (добавено 2026-10-12)

- `npm install` вкарва `sharp` (dev-only, не засяга "no build step" за самия сайт — pipeline-ът се пуска локално от нас/потребителя, не в production).
- `npm run images` чете `images/source/<номер>.<jpg|png|webp|...>` и генерира `images/<номер>.avif` + `.webp` + `.jpg`, изрязани по спецификацията (банер 1600×900, снимка 800×600). За номера 1–16 (вече без source файл) взима текущия `.webp` като вход.
- HTML-ът (`index.html`, `index-bg.html`, `excursions.html`, `excursions-bg.html`) е обновен — снимките за trips 1–5 вече ползват `<picture>` с `avif`/`webp` source + `jpg` fallback; банерите (`data-bg`) и `main.js` сами избират най-добрия поддържан формат в браузъра.
- **Важно:** при генерирането старите `images/1–16.webp` (по-едри оригинали) бяха презаписани с новите, точно изрязани версии. Ако имаш запазени снимките в по-висока резолюция другаде, пази ги отделно — тези на диска вече са финалните уеб версии.
- За новите снимки (trips 06–11): инструкции в `images/source/README.md` — качваш суров файл като `17.jpg`, пускаш `npm run images`, готово. HTML-ът за тия секции ще обновим наведно с реалния текст, когато снимките дойдат (виж т.4 по-долу).

## 4. Задачи за напред (предложен приоритет)

### Блокиращи преди launch
1. **Resend setup** — потребителят трябва да:
   - се регистрира на resend.com,
   - верифицира реалния изпращащ домейн в DNS,
   - вземе API key,
   - зададе `RESEND_API_KEY` (Secret) + `CONTACT_TO_EMAIL` + `CONTACT_FROM_EMAIL` (Vars) в Cloudflare Pages → Settings → Environment variables.
2. **Реални контактни данни** — замяна на `+359000000000` / `[PLACEHOLDER]` телефон и `contact@rokko.bg` с истински данни (ако `contact@rokko.bg` вече е реален — само телефона остава).
3. **Реален домейн** — решаваме какъв ще е крайният домейн и replace-ваме `lazur-trips.com` навсякъде (canonical, hreflang, og:url, JSON-LD, `sitemap.xml`).
4. **Снимки за екскурзии 06–11** — pipeline-ът е готов (т.3 по-горе): потребителят качва суровите снимки в `images/source/`, пуска `npm run images`, после ние обновяваме HTML (picture markup + реален текст: имена, цени, описания) наведно за всяка готова екскурзия.

### Дребни довършителни задачи
5. Реши се какво да правим с `privacy.html` / `cookies.html`: изтриване (препоръчително, тъй като са напълно заменени и орфани) или поправка на redirect-а, ако все пак трябва да останат достъпни по стар линк.
6. Оправяне на мъртвите `-en` redirect-и в `privacy-policy.html` и `terms.html`.

### Преди реален launch (инфраструктура)
7. Да инициализираме git repo за проекта (в момента няма version control — рисково за толкова напреднал проект).
8. Финален preview през тунел/staging с реалните данни, преди да сменим DNS към production.

## 5. Въпрос за решаване сега
Искаш ли да тръгнем първо с попълване на съдържанието за екскурзии 06–11 (текст + layout, докато чакаме реални снимки), или приоритет да е **свалянето на placeholder контактните данни + домейна**, тъй като те са най-бързи за оправяне и блокират всичко останало?
