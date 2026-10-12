/* =====================================================
   LAZUR — Дневни Екскурзии
   main.js
   ===================================================== */

'use strict';

/* ---- Picks the best supported image format (avif > webp > jpg) for
   banners set via CSS background-image, since <picture> doesn't apply
   there. Tiny 1x1 test images, checked once and cached for the page. ---- */
function testImageFormat(dataUri) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img.width > 0);
        img.onerror = () => resolve(false);
        img.src = dataUri;
    });
}
const bannerFormat = Promise.all([
    testImageFormat('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='),
    testImageFormat('data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'),
]).then(([avif, webp]) => (avif ? 'avif' : webp ? 'webp' : 'jpg'));

/* data-bg is either a bare path (needs the picked format appended, e.g.
   "images/2" -> "images/2.avif") or already carries an extension, like the
   images/17-34.svg placeholders for trips that have no real photos yet. */
function resolveBannerUrl(base) {
    if (/\.\w+$/.test(base)) return Promise.resolve(base);
    return bannerFormat.then(ext => `${base}.${ext}`);
}

/* ---- Current page language, for UI strings below (BG default) ---- */
const PAGE_LANG = (document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'bg';
const I18N = {
    bg: { openMenu: 'Отвори менюто', closeMenu: 'Затвори менюто', sending: 'Изпращане…', sent: '✓ Изпратено!', send: 'Изпратете запитването' },
    en: { openMenu: 'Open menu',     closeMenu: 'Close menu',     sending: 'Sending…',     sent: '✓ Sent!',      send: 'Send enquiry' }
}[PAGE_LANG];

/* ---- Language preference (BG/EN) ----
   Redirect логиката е преместена в inline <script> в <head> на всяка HTML
   страница, за да се изпълни преди render-ването на съдържанието.
   Тук пазим само записването на предпочитанието при клик на BG/EN линка. */
document.querySelectorAll('a.lang-link[data-lang]').forEach(a => {
    a.addEventListener('click', () => {
        const lang = (a.dataset.lang || '').toLowerCase().startsWith('en') ? 'en' : 'bg';
        try { localStorage.setItem('lazur_lang', lang); } catch { /* ignore */ }
    });
});

/* ---- Navbar + Back-to-top ---- */
const navbar = document.getElementById('navbar');
const topBtn  = document.getElementById('top-btn');

if (navbar && topBtn) {
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        navbar.classList.toggle('scrolled', y > 60);
        topBtn.classList.toggle('show', y > 500);
    }, { passive: true });

    topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ---- Mobile nav — keyboard accessible ---- */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

function toggleMenu(forceOpen) {
    if (!navToggle || !navLinks || !navbar) return;
    const willOpen = forceOpen !== undefined?
         forceOpen
        : !navLinks.classList.contains('open');

    navLinks.classList.toggle('open', willOpen);
    navToggle.classList.toggle('active', willOpen);
    navbar.classList.toggle('menu-open', willOpen);   // ← премахва backdrop-filter
    document.body.classList.toggle('menu-open', willOpen); // ← заключва body scroll
    navToggle.setAttribute('aria-expanded', String(willOpen));
    navToggle.setAttribute(
        'aria-label',
        willOpen ? I18N.closeMenu : I18N.openMenu
    );
}

if (navToggle && navLinks && navbar) {
    navToggle.addEventListener('click', () => toggleMenu());

    navToggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu();
        }
        if (e.key === 'Escape') toggleMenu(false);
    });

    navLinks.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => toggleMenu(false))
    );

/*
 * БЪГ ПОПРАВЕН (ред 28):
 * На мобилно navLinks е position:fixed; inset:0 — покрива целия екран,
 * но остава ВЪТРЕ в <nav> в DOM-а. Затова navbar.contains(navLinks) = true
 * и document-handler-ът никога не затваря менюто при клик върху overlay-а.
 *
 * Решение: отделен listener директно на navLinks.
 * Ако потребителят кликне точно върху overlay-а (не върху линк),
 * e.target === navLinks и затваряме менюто.
 */
    navLinks.addEventListener('click', e => {
        if (e.target === navLinks) toggleMenu(false);
    });

/* Затваряне при клик извън навигацията (десктоп) */
    document.addEventListener('click', e => {
        if (!navbar.contains(e.target)) toggleMenu(false);
    });
}

/* ---- Scroll reveal ---- */
const supportsIO = 'IntersectionObserver' in window;

if (supportsIO) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    /* ---- Lazy-load CSS background-images на банерите ---- */
    const bannerObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.target.dataset.bg) {
                const el = entry.target;
                resolveBannerUrl(el.dataset.bg).then(url => { el.style.backgroundImage = `url('${url}')`; });
                bannerObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '200px' }); /* зареждане 200px преди влизане в viewport */

    document.querySelectorAll('.exc-banner[data-bg]').forEach(b =>
        bannerObserver.observe(b)
    );
} else {
    /* Fallback: ако API-то липсва, не оставяй съдържанието скрито */
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    document.querySelectorAll('.exc-banner[data-bg]').forEach(b => {
        if (b.dataset.bg) resolveBannerUrl(b.dataset.bg).then(url => { b.style.backgroundImage = `url('${url}')`; });
    });
}

/* ---- Contact form — /api/contact (Cloudflare Function) + валидация ---- */
const contactForm = document.getElementById('contactForm');
const sendBtn     = document.getElementById('sendBtn');
const msgOk       = document.getElementById('form-success');
const msgErr      = document.getElementById('form-error');

/* Email regex — проверява за реален формат, не само дали е попълнено */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Валидира задължителните полета (Ime + Email).
 * Маркира невалидните с .invalid и показва грешката под полето.
 * Фокусира първото невалидно поле.
 * @returns {boolean}
 */
function validateForm() {
    const nameField  = document.getElementById('f-name');
    const emailField = document.getElementById('f-email');
    const nameErr    = document.getElementById('name-err');
    const emailErr   = document.getElementById('email-err');

    if (!nameField || !emailField || !nameErr || !emailErr) return false;

    let firstInvalid = null;
    let valid = true;

    /* Изчистване на предишни грешки */
    nameField.classList.remove('invalid');
    emailField.classList.remove('invalid');
    nameField.removeAttribute('aria-invalid');
    emailField.removeAttribute('aria-invalid');

    if (!nameField.value.trim()) {
        nameField.classList.add('invalid');
        nameField.setAttribute('aria-invalid', 'true');
        nameErr.style.display = 'block';
        firstInvalid = firstInvalid ?? nameField;
        valid = false;
    } else {
        nameErr.style.display = 'none';
    }

    if (!emailField.value.trim() || !EMAIL_REGEX.test(emailField.value.trim())) {
        emailField.classList.add('invalid');
        emailField.setAttribute('aria-invalid', 'true');
        emailErr.style.display = 'block';
        firstInvalid = firstInvalid ?? emailField;
        valid = false;
    } else {
        emailErr.style.display = 'none';
    }

    if (firstInvalid) firstInvalid.focus();
    return valid;
}

if (contactForm && sendBtn && msgOk && msgErr) contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    /* Loading state */
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.textContent = I18N.sending;
    msgOk.classList.remove('visible');
    msgErr.classList.remove('visible');

    try {
        const res = await fetch(contactForm.action, {
            method:  'POST',
            body:    new FormData(contactForm),
            headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
            sendBtn.classList.remove('sending');
            sendBtn.classList.add('sent');
            sendBtn.textContent = I18N.sent;
            /* БЪГ ПОПРАВЕН: бутонът оставаше disabled=true след успех.
               При ново посещение на формата или след reset, бутонът беше
               неактивен завинаги. Нулираме disabled веднага след успех. */
            sendBtn.disabled = false;
            msgOk.classList.add('visible');
            contactForm.reset();
            /* След 5 сек. връщаме бутона в изходно състояние */
            setTimeout(() => {
                sendBtn.classList.remove('sent');
                sendBtn.textContent = I18N.send;
            }, 5000);
        } else {
            throw new Error(`Server responded with ${res.status}`);
        }
    } catch (err) {
        console.error('Form submission error:', err);
        sendBtn.disabled = false;
        sendBtn.classList.remove('sending');
        sendBtn.textContent = I18N.send;
        msgErr.classList.add('visible');
    }
});

/* Изчиства грешките веднага щом потребителят започне да пише */
if (contactForm) {
    contactForm.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', () => {
            el.classList.remove('invalid');
            el.removeAttribute('aria-invalid');
            const errEl = document.getElementById(`${el.id}-err`);
            if (errEl) errEl.style.display = 'none';
        });
    });
}

/* ---- Active nav link on scroll ---- */
(function () {
    var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!navAnchors.length || !('IntersectionObserver' in window)) return;
    var linkMap = {};
    navAnchors.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        var section = document.getElementById(id);
        if (section) linkMap[id] = a;
    });
    var sectionIds = Object.keys(linkMap);
    if (!sectionIds.length) return;
    var currentActive = null;
    function setActive(id) {
        if (currentActive === id) return;
        currentActive = id;
        navAnchors.forEach(function (a) { a.classList.remove('active'); });
        if (id && linkMap[id]) linkMap[id].classList.add('active');
    }
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { threshold: 0, rootMargin: '0px 0px -60% 0px' });
    sectionIds.forEach(function (id) {
        observer.observe(document.getElementById(id));
    });
}());

/* ---- Cookie banner ---- */
(function () {
    var COOKIE_KEY = 'rokko_cookies';
    var banner     = document.getElementById('cookie-banner');
    var btnAccept  = document.getElementById('cookie-accept');
    var btnDecline = document.getElementById('cookie-decline');
    if (!banner || !btnAccept || !btnDecline) return;
    try {
        if (!localStorage.getItem(COOKIE_KEY)) {
            setTimeout(function () {
                banner.removeAttribute('hidden');
                /* rAF гарантира че браузърът е рендерирал display:flex
                   преди да добавим opacity transition */
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        banner.classList.add('visible');
                    });
                });
            }, 800);
        }
    } catch (e) { return; }
    function dismiss(accepted) {
        try { localStorage.setItem(COOKIE_KEY, accepted ? 'accepted' : 'declined'); } catch (e) {}
        banner.classList.remove('visible');
        setTimeout(function () { banner.setAttribute('hidden', ''); }, 350);
    }
    btnAccept.addEventListener('click',  function () { dismiss(true);  });
    btnDecline.addEventListener('click', function () { dismiss(false); });
}());
