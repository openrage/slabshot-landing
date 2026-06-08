// Cloudflare Pages Function (Worker) — POST /api/feedback
// Serverless sink for in-app feedback + tester opt-in. Scales to zero; free tier. Writes to a KV
// namespace bound as `FEEDBACK`. PII (optional email) is covered by the privacy policy.
// No always-on server — this is intentionally the lightweight sink (real backend stays separate).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MSG = 4000;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      // The Android app posts cross-origin; allow it.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    // Tolerate form-encoded too.
    try {
      const f = await request.formData();
      body = Object.fromEntries(f.entries());
    } catch (__) {
      return json({ error: "Bad request." }, 400);
    }
  }

  const message = String(body.message || "").trim().slice(0, MAX_MSG);
  const email = String(body.email || "").trim().toLowerCase();
  const tester = body.tester === true || body.tester === "yes" || body.tester === "true";

  if (!message && !email && !tester) return json({ error: "Nothing to send." }, 400);
  if (email && !EMAIL_RE.test(email)) return json({ error: "Enter a valid email." }, 400);

  const record = {
    message,
    email: email || null,
    tester,
    app_version: String(body.app_version || "").slice(0, 40) || null,
    platform: String(body.platform || "").slice(0, 60) || null,   // e.g. "Android 14 / Samsung SM-S918"
    ts: new Date().toISOString(),
    country: request.headers.get("CF-IPCountry") || null,
  };

  if (env.FEEDBACK) {
    try {
      const key = "fb:" + record.ts + ":" + crypto.randomUUID().slice(0, 8);
      await env.FEEDBACK.put(key, JSON.stringify(record));
    } catch (_) {
      return json({ error: "Storage error — try again." }, 500);
    }
  }
  // If FEEDBACK isn't bound yet, still 200 so the app flow works in preview.

  return json({ ok: true, message: "Thanks — your feedback was sent." });
}

export function onRequestGet() {
  return json({ ok: true, hint: "POST feedback here." });
}
