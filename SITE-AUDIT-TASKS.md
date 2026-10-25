# ROKKO / LAZUR Day Trips — Анализ на сайта и задачи

## ⚠️ Сайтът НЕ е достъпен за индексиране (добавено 2026-10-25)
Преди реално качване в Cloudflare — нарочно блокирахме Google/всички роботи на 3 нива, докато не сме готови за launch:
1. `robots.txt` → `Disallow: /` (беше `Allow: /`)
2. `<meta name="robots" content="noindex, nofollow">` в `index.html` + `index-bg.html`
3. `X-Robots-Tag: noindex, nofollow` в `_headers` (важи за целия сайт, дори не-HTML файлове)

**Преди истинския launch — трите промени трябва да се махнат**, иначе сайтът остава невидим за Google завинаги. Всяка промяна е маркирана с `PRE-LAUNCH` коментар в кода за лесно откриване.

Дата на последно обновяване: 2026-10-19
Статичен сайт (без build стъпка), хостван в Cloudflare Pages. Директория: `PROJECT_ROKO_SITE`.
Git repo: инициализиран и push-нат — **https://github.com/ogobrew-ogi/RokkoSite** (branch `main`).

## 1. Текущо състояние на сайта

### Структура
- `index.html` (EN, начална страница по подразбиране) / `index-bg.html` (BG) — **5 реални тура**
- `excursions.html` (EN) / `excursions-bg.html` (BG) — **4 реални тура**
- `privacy-policy.html`, `terms.html` — активните правни страници
- `privacy.html`, `cookies.html` — **орфани**, вече не са линкнати от навигацията/футъра никъде
- `functions/api/contact.js` — Cloudflare Pages Function, изпраща контактната форма през Resend
- `_headers` — security headers (CSP, HSTS, X-Frame-Options и т.н.) — изглеждат коректно зададени
- `images/1–28.{avif,webp,jpg}` — всички реални снимки (банери + детайлни двойки за 9-те тура)
- `tools/build-images.mjs` + `images/source/` — автоматичен image pipeline (виж секция 3)

### Какво работи
- EN е начална страница по подразбиране, BG е вторична (превключва се с toggle).
- Hreflang / canonical / og:url / JSON-LD синхронизирани между EN/BG версиите.
- Контактната форма ползва `action="/api/contact"` → Cloudflare Function с Resend. Dropdown-ът с турове е обновен с реалните 9 имена.
- **Реално съдържание за 9 тура** (виж секция 4) — вместо фиктивните "Azure Bay" и т.н.
- Валута навсякъде: **EUR** (сменено от BGN по желание на потребителя — международна аудитория).

### Какво НЕ работи / е недовършено

| # | Проблем | Къде | Сериозност |
|---|---|---|---|
| 1 | Контактната форма **не изпраща реално имейли** — няма зададени `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` в Cloudflare Pages env | `functions/api/contact.js` | Блокиращ |
| 2 | Телефон и имейл са placeholder-и навсякъде (`+359000000000`, `[PLACEHOLDER — +359 88 ...]`) | всички HTML | Блокиращ |
| 3 | Домейнът е още placeholder `lazur-trips.com` — в canonical/hreflang/og/sitemap | всички HTML + `sitemap.xml` | Блокиращ |
| 4 | **Снимките за 9-те тура са временни, безплатни снимки от Wikimedia Commons** (CC BY-SA 3.0/4.0), не истински авторски снимки на ROKKO | `images/2–28.*` | Блокиращ преди реален launch — виж секция 4 |
| 5 | `privacy.html` и `cookies.html` са орфани, с счупен redirect към несъществуващ `index-en.html` | `privacy.html`, `cookies.html` | Козметичен |
| 6 | `privacy-policy.html` и `terms.html` имат мъртъв inline redirect към `-en` версии, които не съществуват | `privacy-policy.html`, `terms.html` | Дребен бъг |
| 7 | "Season" стойностите (Year-round / May–Oct / Apr–Oct) за новите турове са **мои разумни предположения**, не потвърдени от бизнеса | meta-card редове на всеки тур | Нужда от потвърждение |

## 2. Image pipeline

- `npm run images` чете `images/source/<номер>.<jpg|png|webp>` и генерира `images/<номер>.avif` + `.webp` + `.jpg` (банер 1600×900, снимка 800×600).
- Raw снимките в `images/source/` НЕ се качват в git (`.gitignore`) — само обработените `images/*.avif/webp/jpg` се пазят в репото.

## 3. Реално съдържание за 9-те тура (добавено 2026-10-19)

Качен беше документ с реални турове ("One day tours"), напълно различни от старите фиктивни примери. По договорка с потребителя:

- **Заменени изцяло всички 11 стари слота с 9 реални тура** — 5 на начална страница, 4 в "More trips".
- **Валута: само EUR**, навсякъде (мета данни, JSON-LD schema, UI, dropdown).
- **Снимки:** тъй като нямаше реални авторски снимки за новите теми (тракийски гробници, Ниш, Пловдив, Бузлуджа, Скопие, пещери), намерих CC-лицензирани снимки от Wikimedia Commons за всеки тур (проверени визуално преди употреба) и ги прекарах през `build-images.mjs`, за да генерират банер + 2 детайлни снимки (различни изрязвания на същия изходен файл).

### Разпределение на турове / снимкови слотове

| Trip | Страница | Снимка (banner/photo/photo) | Източник (Wikimedia, CC BY-SA) |
|---|---|---|---|
| 01 Full Day Tour of Sofia | index | 2 / 3 / 4 | Alexander Nevsky Cathedral |
| 02 Valley of the Thracian Kings | index | 5 / 6 / 7 | Thracian Tomb, Kazanlak |
| 03 Plovdiv — History & Craft Beer | index | 8 / 9 / 10 | Plovdiv Old Town |
| 04 Hiking in Pirin & Bansko | index | 11 / 12 / 13 | Bezbozhko Lake, Pirin NP |
| 05 Buzludzha & Museum of Socialist Art | index | 14 / 15 / 16 | Buzludzha monument |
| 06 Day Tour to Nis, Serbia | excursions | 17 / 18 / 19 | Nis Fortress (night) |
| 07 Skopje & Matka Canyon | excursions | 20 / 21 / 22 | Matka Canyon |
| 08 Skopje — Small Group | excursions | 23 / 24 / 25 | Macedonia Square, Skopje |
| 09 Lovech, Devetashka Cave & Krushuna | excursions | 26 / 27 / 28 | Krushuna waterfalls |

**⚠️ Важно — атрибуция/лиценз:** тези снимки са CC BY-SA 3.0/4.0 от Wikimedia Commons, добри за preview, но технически изискват атрибуция (име на автор + линк към лиценза) при публично ползване, или трябва да бъдат заменени с ваши собствени снимки преди реален launch. В момента няма атрибуция никъде на сайта.

**⚠️ Проверка на фактите:** текстовете за турове (история, маршрути, забележителности) са базирани на предоставения документ + общи познания — препоръчвам фактическа проверка (особено дати, часове на работа, конкретни цени) преди да публикувате.

## 4. Задачи за напред (предложен приоритет)

### Блокиращи преди launch
1. **Снимки** — или добавете атрибуция за Wikimedia снимките, или ги заменете с истински авторски снимки (през `images/source/` + `npm run images`).
2. **Resend setup** — регистрация на resend.com, верификация на домейн, `RESEND_API_KEY` + `CONTACT_TO_EMAIL` + `CONTACT_FROM_EMAIL` в Cloudflare Pages env.
3. **Реални контактни данни** — телефон и имейл.
4. **Реален домейн** — замяна на `lazur-trips.com` навсякъде.
5. **Потвърждение на "Season" стойностите** и прегледа на цените/продължителността по тур.

### Дребни довършителни задачи
6. `privacy.html` / `cookies.html` — изтриване или поправка на redirect.
7. Мъртвите `-en` redirect-и в `privacy-policy.html` / `terms.html`.

### Инфраструктура
8. ✅ Git repo вече е създаден и push-нат — следваща стъпка: commit на днешните промени (снимки + ново съдържание), когато потребителят потвърди.
9. Финален preview през тунел/staging, преди смяна на DNS към production.

## 5. Въпрос за решаване сега
Доволен ли си от разпределението на туровете (кои 5 на начална страница, кои 4 в "More trips") и от избраните снимки? Ако да, искаш ли да commit-на и push-на промените в GitHub repo-то сега?
