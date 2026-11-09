# W6.3 — Documentation, FAQ, and project support

Website documentation and help surfaces so a developer can understand Easy Payments, pick a mode, and complete a first **mock** checkout. **No npm publish, push, deploy, contact activation, or payments.**

## Completed

### Developer docs (published Angular 1.0.0 / 1.1.0 catalogs)
- **Quick start** rewritten with install → `provideEasyPayments({ enableMockMode: true })` → Full Checkout snippet, version-pinned (1.1.0 and 1.0.0).
- New **Checkout modes** page: Full Checkout (npm) vs Buttons Only / Headless (**Unpublished — 1.2.0**), with Playground links and UI ownership clarified.
- **Payment methods** status table: real/TEST vs mock DEMO; Klarna DEMO called out; Samsung Pay not supported.
- **Klarna** guide: real/TEST config + explicit mock DEMO (not official Klarna UI).
- **Getting started** / **Configuration** / **API reference** updated for modes, consumer-owned price/currency/order/theme/locale, FAQ links.
- Snippets checked against published public APIs in `historical-api.evidence` / package peers (Angular `>=20.3.0 <23.0.0`, Full Checkout inputs/outputs). Buttons Only / Headless documented as **not** on npm 1.1.0.

### FAQ (`/faq`)
- Site page with en / es / pt content catalogs, TOC anchors, accessible `<details>`/`<summary>`.
- Linked from footer, docs article footer, and FAQ answers → guides / Playground / contact / support.
- Covers the thirteen required topics (modes, backend, methods, demo charges, keys, events, Angular versions, MIT cost vs provider fees, etc.).

### Support the project
- Discrete footer link + `/support` page + card at end of every docs article.
- Copy in en / es / pt based on the requested Spanish base.
- `environment.paypalSupportUrl` / production counterpart: **`null`** → GitHub options only; PayPal button appears only when a valid `http(s)` URL is set.
- No PayPal SDK; separate from checkout/Playground; contact email unused.

## Examples verified (static / API evidence)

| Example | Version | Check |
| --- | --- | --- |
| Quick start install + mock Full Checkout | 1.1.0 / 1.0.0 | Matches `provideEasyPayments`, `<easy-payments>` inputs/outputs from published evidence |
| Checkout modes matrix | docs | Distinguishes npm vs unpublished 1.2.0 |
| Payment methods table | docs | Aligned with supported method ids; Klarna DEMO wording |
| Support PayPal hidden | unit | `SupportProjectCard` when `paypalSupportUrl` is null |

## Validations run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass (47 prerendered routes incl. `/faq`, `/support`, `checkout-modes`) |
| `npm run test:ci` | Pass (120 tests / 30 files) |
| `npm run build:prod` | Pass (budget warning on main bundle) |
| `npm run verify:static` | Pass (47 `index.html`) |
| Playground `verify:mock-network` | Skipped — Playground providers untouched; only footer/docs support card added |

## Still pending for launch

1. Publish npm **1.2.0**, then fold Buttons Only / Headless into published docs and remove Unpublished labels.
2. Maintainer provides **`paypalSupportUrl`** (https) — until then PayPal CTA stays hidden (explicitly pending).
3. Production contact (Turnstile, SES, API, CSP) — still off from W6.2.
4. Push / Amplify deploy — out of scope for W6.3.
5. Optional: deeper provider guides (live webhook samples) beyond current verified summaries.

## Notes

- Docs remain English markdown catalogs (versioned); FAQ/support use the site i18n system (en/es/pt).
- ngx-stripe.dev used as a structural reference (quick start → modes → methods → FAQ), while messaging stays multi-provider Easy Payments.
