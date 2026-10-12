/* =====================================================
   Cloudflare Pages Function — POST /api/contact
   Приема заявката от контактната форма и я изпраща по имейл
   през Resend (https://resend.com), вместо трета страна (Formspree).

   Изисква в Cloudflare Pages → Settings → Environment variables:
     RESEND_API_KEY    (Secret)  — API key от Resend
     CONTACT_TO_EMAIL  (Var)     — къде да пристигат запитванията, напр. contact@rokko.bg
     CONTACT_FROM_EMAIL(Var)     — верифициран изпращач в Resend, напр. website@ТВОЯ-ДОМЕЙН
   ===================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return json({ error: 'Invalid form submission' }, 400);
    }

    /* Honeypot — ботовете попълват скритото поле, хората — не.
       Отговаряме с "ok", без да пращаме имейл, за да не издаваме защитата. */
    if (form.get('_gotcha')) {
        return json({ ok: true }, 200);
    }

    const name    = String(form.get('name')      || '').trim();
    const email   = String(form.get('email')     || '').trim();
    const phone   = String(form.get('phone')     || '').trim();
    const trip    = String(form.get('excursion') || '').trim();
    const people  = String(form.get('people')    || '').trim();
    const date    = String(form.get('date')      || '').trim();
    const message = String(form.get('message')   || '').trim();

    if (!name || !EMAIL_RE.test(email)) {
        return json({ error: 'Missing or invalid name/email' }, 400);
    }

    if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
        console.error('Missing RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL env vars');
        return json({ error: 'Email service not configured' }, 500);
    }

    const bodyLines = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone   && `Phone: ${phone}`,
        trip    && `Trip: ${trip}`,
        people  && `People: ${people}`,
        date    && `Preferred date: ${date}`,
        message && `Message:\n${message}`,
    ].filter(Boolean).join('\n');

    let resendRes;
    try {
        resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `ROKKO website <${env.CONTACT_FROM_EMAIL}>`,
                to: [env.CONTACT_TO_EMAIL],
                reply_to: email,
                subject: `New enquiry from ${name}${trip ? ' — ' + trip : ''}`,
                text: bodyLines,
            }),
        });
    } catch (err) {
        console.error('Resend request failed:', err);
        return json({ error: 'Email send failed' }, 502);
    }

    if (!resendRes.ok) {
        console.error('Resend API error:', resendRes.status, await resendRes.text());
        return json({ error: 'Email send failed' }, 502);
    }

    return json({ ok: true }, 200);
}

function json(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
