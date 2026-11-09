# W6.4 — Launch-review local preview (Easy Payments 1.2.0)

Prepare the website so local preview matches launch-day presentation. **No npm publish, push, Amplify deploy, or real email.** Live demos and docs examples are validated against `vendor/@easy-payments/angular@1.2.0`; the public install command is ready for the separate publish step.

## Local routes to review

| Route | What to check |
| --- | --- |
| `/` | 1.2.0 branding; Full / Buttons / Headless available |
| `/docs/angular/1.2.0/getting-started` | Latest docs catalog |
| `/docs/angular/1.2.0/quick-start` | `npm install @easy-payments/angular@1.2.0` |
| `/docs/angular/1.2.0/checkout-modes` | Mode matrix + Playground deep links |
| `/docs/angular/1.2.0/full-checkout` | Complete Full Checkout guide |
| `/docs/angular/1.2.0/buttons-only` | Complete Buttons Only guide |
| `/docs/angular/1.2.0/headless` | Complete Headless guide |
| `/docs/angular/1.2.0/api-reference` | Full + Buttons + Headless API |
| `/playground` | Badge **1.2.0**; Full demo default |
| `/playground?demo=full` | Full Checkout + “View integration guide” |
| `/playground?demo=buttons` | Buttons Only + guide link |
| `/playground?demo=headless` | Headless + guide link |
| `/faq` | TOC + “Open this question in a new tab” |
| `/faq#which-mode` | Fresh load auto-expands that answer |
| `/contact` | With `npm run contact:local` running |

How to run locally:

```bash
npm run contact:local   # terminal 1 — dual-stack mock API on :8787
npm start               # terminal 2 — prefer http://127.0.0.1:4200
```

## Contact form — root cause and fix

**Symptom:** Turnstile test widget shows “Success!”, but the form shows “Message not sent.”

**Root cause (two cooperating failures):**

1. **IPv6 `localhost` vs IPv4-only listener.** Dev `contactApiUrl` was `http://localhost:8787/contact`. On Windows, Node/browsers often resolve `localhost` → `::1` first. The local API listened only on `127.0.0.1`, so `fetch` failed while Turnstile (client-side) still succeeded → generic “Message not sent.”
2. **Dual-stack bind crash.** Binding to `::` without bracketing the host when parsing `new URL(req.url, base)` threw `Invalid URL` (`base: 'http://::'`), which killed the API mid-request.

**Fix:**

- Site env (`environment.ts`) posts to **`http://127.0.0.1:8787/contact`** (IPv4-explicit).
- `scripts/local-contact-api.mjs` listens dual-stack (`host: '::', ipv6Only: false`) and uses a bracketed IPv6 URL base for pathname checks.
- Failed submissions still preserve fields and refresh Turnstile (existing behavior); honeypot + Turnstile siteverify unchanged. Production remains Gmail/SES via the real contact stack (not exercised in this step).

**Browser E2E (local-mock):** POST `http://127.0.0.1:8787/contact` → **200** `{"status":"accepted"}` → UI **Message sent**; API log captured email subject with no send.

## 1.2.0 presentation and guides

- Framework catalog / docs latest = **1.2.0** (launch-review presentation).
- New docs catalog `src/content/docs/angular/1.2.0/` including complete **Full Checkout**, **Buttons Only**, and **Headless** guides with distinct mock-mode examples (product, price, currency, methods/order, results).
- Public install command in guides: `npm install @easy-payments/angular@1.2.0 @stripe/stripe-js`.
- **Local vs npm:** examples validated against vendor `file:vendor/easy-payments-angular` @ **1.2.0**. npm publication is intentionally out of scope for W6.4.
- Playground ↔ guides: `?demo=full|buttons|headless` and “View integration guide” links to `/docs/angular/1.2.0/{full-checkout|buttons-only|headless}`.
- Klarna remains labeled **DEMO** in mock/playground copy; payment-methods matrix still distinguishes mock / sandbox-TEST / verified live claims.
- Site chrome copy remains en / es / pt.

## FAQ deep links

- Docs markdown links to `/faq` / `/faq#…` open with `target="_blank"` `rel="noopener noreferrer"`.
- FAQ TOC and per-answer “Open this question in a new tab” use the same attributes.
- Fragment navigation auto-expands the matching `<details>` on load; summary still toggles in place.

## Validation results

| Check | Result |
| --- | --- |
| Browser: three guides + playground demos + guide links | Pass (local preview) |
| Browser: contact E2E with `contact:local` | Pass (200 accepted / Message sent) |
| Browser: FAQ `#methods-status` auto-expand + new-tab links | Pass |
| `npm run typecheck` | Pass (72 prerendered routes) |
| `npm run test:ci` | Pass (124 tests / 30 files) |
| `npm run build:prod` | Pass (budget warning on main bundle) |
| `npm run verify:static` | Pass (72 `index.html`) |
| `npm run verify:mock-network` | Pass against `http://127.0.0.1:4200` (vendor pure Stripe + 0 SDK hits). Prefer `127.0.0.1` when `ng serve` is bound to IPv4. |
| `npm run contact:typecheck` | Pass |
| `npm run contact:test` | Pass (87 tests) |

## Still after this review

1. Publish `@easy-payments/angular@1.2.0` to npm (site already documents the install command).
2. Amplify / production deploy.
3. Production contact activation (Turnstile, SES → Gmail) — keep real delivery for that verification.
4. Optional: maintainer `paypalSupportUrl`.

## Stop

Website is ready for **local launch review**. Do not publish to npm, push, deploy to Amplify, or send real emails in this step.
