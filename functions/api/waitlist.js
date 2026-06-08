// Cloudflare Pages Function — POST /api/waitlist
// Stores a waitlist signup (PII: email + consent + optional tester flag) in a KV namespace
// bound as `WAITLIST`. Minimal by design. See site/README.md for the one-time KV setup.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function html(body, status = 200) {
  return new Response(
    `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">` +
    `<title>SlabShot</title><link rel=stylesheet href="/assets/css/slab.css">` +
    `<div class=bg></div><main class=wrap><div class=prose>${body}` +
    `<p><a href="/">← Back to SlabShot</a></p></div></main>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  let email = "", consent = false, tester = false;

  try {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    consent = String(form.get("consent") || "") === "yes";
    tester = String(form.get("tester") || "") === "yes";
  } catch (_) {
    return wantsJson ? json({ error: "Bad request." }, 400)
                     : html("<h1>Bad request</h1><p>Could not read the form.</p>", 400);
  }

  if (!EMAIL_RE.test(email)) {
    return wantsJson ? json({ error: "Enter a valid email." }, 400)
                     : html("<h1>Invalid email</h1><p>Please go back and enter a valid address.</p>", 400);
  }
  if (!consent) {
    return wantsJson ? json({ error: "Consent is required." }, 400)
                     : html("<h1>Consent required</h1><p>Please tick the consent box.</p>", 400);
  }

  // Persist. Keyed by email so a re-submit just updates (idempotent, no dupes).
  if (env.WAITLIST) {
    const record = {
      email,
      tester,
      ts: new Date().toISOString(),
      ip_country: request.headers.get("CF-IPCountry") || null,
      ua: (request.headers.get("User-Agent") || "").slice(0, 200),
    };
    try {
      await env.WAITLIST.put("signup:" + email, JSON.stringify(record));
    } catch (_) {
      return wantsJson ? json({ error: "Storage error — try again." }, 500)
                       : html("<h1>Try again</h1><p>We couldn't save that just now.</p>", 500);
    }
  }
  // If WAITLIST isn't bound yet, we still return success so the page works in preview.

  const msg = tester ? "You're on the list — and noted as a tester. Watch your inbox."
                     : "You're on the list — watch your inbox.";
  return wantsJson ? json({ ok: true, message: msg })
                   : html(`<h1>You're in</h1><p>${msg}</p>`);
}

// A GET here shouldn't 405-crash; nudge back to the form. (Workers' Response.redirect needs an
// ABSOLUTE URL — a relative path throws, which surfaced as a 500.)
export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/#waitlist", request.url).toString(), 302);
}
