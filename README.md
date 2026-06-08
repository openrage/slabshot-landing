# SlabShot — marketing site (getslabshot.com)

Static front door on **Cloudflare Pages**, plus one Pages Function for the waitlist. No build
step — plain HTML/CSS/JS with the app's own fonts + bass mark, so the brand matches exactly.

```
site/
  index.html              landing page (hero, what-it-does, waitlist)
  privacy.html            public privacy policy (Play Data Safety-aligned)
  assets/css/slab.css     the design system as CSS (marine instrument, depth gradient)
  assets/fonts/*.ttf      Rajdhani + Barlow (self-hosted = no third-party font requests)
  assets/img/             slabshot_mark.png (logo + favicon, recolored teal via CSS mask)
  assets/js/waitlist.js   progressive-enhancement form submit
  functions/api/waitlist.js   Pages Function → KV (POST /api/waitlist)
  _headers                security headers + asset caching
```

## Deploy (one time)

1. **Create the Pages project.** Cloudflare dashboard → Workers & Pages → Create → Pages →
   *Connect to Git* (this repo) **or** *Direct Upload*.
   - Build command: *(none)* · Build output directory: `/` (this repo serves the site from root).
2. **Custom domain.** Pages project → Custom domains → add `getslabshot.com` (and `www` →
   redirect). Cloudflare handles the TLS cert. Point the domain's nameservers/DNS at Cloudflare
   if it isn't already.
3. **Waitlist storage (KV).**
   - Workers & Pages → KV → *Create namespace*, e.g. `slabshot_waitlist`.
   - Pages project → Settings → **Functions → KV namespace bindings** → add binding
     **Variable name `WAITLIST`** → the namespace. (Add it for **Production** and **Preview**.)
   - Redeploy. `POST /api/waitlist` now writes `signup:<email>` → `{email,tester,ts,…}`.
   - If the binding is absent, the form still returns success (so previews work) but stores
     nothing — so don't forget the binding in Production.
4. **In-app feedback sink (KV).** The Android app POSTs to `/api/feedback` (`functions/api/feedback.js`).
   Create a second KV namespace (e.g. `slabshot_feedback`) and bind it as **`FEEDBACK`** (Production
   + Preview), same as above. Stores `fb:<ts>:<id>` → `{message,email,tester,app_version,platform,…}`.
   Scales to zero, free tier — no always-on server. (Fly is reserved for the real backend later:
   fish-ID inference, data sync.)

To read signups/feedback: KV namespace → *View* in the dashboard, or
`wrangler kv:key list --binding WAITLIST` / `--binding FEEDBACK`.

## Local preview

```
npx wrangler pages dev .           # serves the static site + the /api/waitlist & /api/feedback Functions
```
(For the function to persist locally, pass a KV binding: `--kv WAITLIST`.)

## Notes / guardrails

- **Privacy policy must stay in sync with the Play Data Safety form** — location (coarsened
  before any network call), photos (on-device; export keeps original GPS), opt-in county-level
  data sharing, GPS-scrubbed diagnostics, and the waitlist email (PII, explicit consent). If app
  data handling changes, update `privacy.html`.
- **Out of scope for this pass:** hosting/displaying user-uploaded cards or exports. That's a
  content backend (upload API, storage, public display, moderation) — a separate decision.
- No cookies, no analytics, no third-party scripts. Keep it that way unless the policy is updated.
- Update the placeholder emails (`hello@`, `privacy@getslabshot.com`) once mailboxes exist.
