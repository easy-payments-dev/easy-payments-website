# W6.2 — Implementation report

Website on local unpublished `@easy-payments/angular@1.2.0`, three real playground demos, protected `/contact`, and Amplify Hosting prep. **No npm publish, no cloud apply/deploy, no real email.**

## Changes

### Local library 1.2.0
- Dependency: `"@easy-payments/angular": "file:vendor/easy-payments-angular"`.
- Sync: `npm run sync:lib` / `npm run sync:lib:build` copies sibling `../easy-payments-angular/dist/easy-payments` into `vendor/` and asserts `@stripe/stripe-js/pure`.
- Prebuild: `scripts/ensure-vendor-angular.mjs` fails if vendor is missing or not 1.2.0 with pure Stripe.
- Removed temporary npm **1.1.0** `patch-package` / `patches/` / postinstall (no other patches remain).
- Lockfile resolves the `file:` package. **`vendor/easy-payments-angular` must be committed** for clean CI / Amplify `npm ci`.

### Playground (three real demos)
- Selector: **Full Checkout** (`<easy-payments>`), **Buttons Only** (`<easy-payment-buttons>`), **Headless** (`EasyPaymentsHeadless` + consumer-owned UI).
- Badge: **Unpublished — 1.2.0**. Snippets still target published npm 1.0.0 / 1.1.0 APIs.
- `enableMockMode` + `MockPaymentController` outcomes; Klarna labeled DEMO (library mock, not official Klarna).
- Remount on demo / methods / theme / locale / reset to avoid residual state.
- i18n: en / es / pt; themes: light / dark / system unchanged.

### Contact
- Route `/contact` (nav + footer); client-only like playground.
- Fields: name (100), reply email (254), type, message (3000); honeypot; no attachments.
- Turnstile loaded only on `/contact`; production form disabled until API URL + site key are set.
- Local: `npm run contact:local` → `http://localhost:8787/contact` + Turnstile test site key (no real email).

### Backend IaC (`infra/contact/`) — not applied
- CDK: API Gateway HTTP API → Lambda → SES; DynamoDB for rate limit + idempotency (TTL, hashed IP).
- Fixed recipient server-side (`CONTACT_TO_EMAIL`, default `jantvb@gmail.com`); visitor email is Reply-To only.
- Subject: `[Easy Payments] <type>`; plain-text body; success only when SES accepts send.
- Limits: 3 sends / IP / 15 min; global 50 SES attempts / day; attempt counter also covers many rejects.
- `local-mock` email transport refused outside local/test stages.

### Amplify prep (not deployed)
- `amplify.yml` (Node 22, `npm ci`, `build:prod`, `verify:static`, artifacts `dist/easy-payments-website/browser`).
- `amplify/redirects.json`, `customHttp.yml`, `docs/amplify-hosting.md`.
- SPA fallback for `/playground` and `/contact` without rewriting static assets.

## Local 1.2.0 consumption

```
easy-payments-dev/
  easy-payments-angular/     # sibling source; npm run build:lib
  easy-payments-website/
    vendor/easy-payments-angular/   # committed file: package (1.2.0)
    package.json → "file:vendor/easy-payments-angular"
```

Clean install: `npm ci` (requires committed vendor). Refresh vendor after library changes: `npm run sync:lib:build`.

## Validations run

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run test:ci` | Pass (119) |
| `npm run contact:test` | Pass (87) |
| `npm run build:prod` | Pass (budget warning on main bundle size) |
| `npm run verify:static` | Pass |
| `npm run verify:mock-network` | Pass (vendor pure import + Playwright playground; 0 payment SDK / Turnstile hits) |
| Real SES / Amplify / Turnstile prod | **Not run** (stage limits) |

## Contact architecture

```
Browser /contact
  → Cloudflare Turnstile (site key public)
  → POST contact API (Idempotency-Key)
       → validate + honeypot
       → siteverify (secret server-side; hostname + action)
       → DynamoDB rate limit (HMAC IP) + global day cap + idempotency
       → SES SendEmail (From verified; Reply-To visitor; To fixed)
```

Frontend never selects the recipient and never holds AWS / Turnstile secrets.

## Variables (no secret values)

### Frontend (`environment*.ts`)
- `contactTransport`: `'local-mock' \| 'api'`
- `contactApiUrl`: string \| null
- `turnstileSiteKey`: string \| null
- `contactEnabled`: boolean

Dev uses local mock URL + Cloudflare **test** site key `1x00000000000000000000AA`. Production stays disabled (`null` / `false`) until configured.

### Backend (`infra/contact/.env.example`)
- `STAGE`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`
- `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_ALLOWED_HOSTNAMES`
- `ALLOWED_ORIGINS`, `IP_HASH_SECRET`
- `RATE_LIMIT_*`, `GLOBAL_DAILY_SES_CAP`
- `CONTACT_EMAIL_TRANSPORT` (`ses` \| `local-mock`)
- DynamoDB table names / AWS region via stack outputs

## Pending before go-live

1. **Commit `vendor/easy-payments-angular`** (Amplify/CI blocker if untracked).
2. Configure real Turnstile site + secret; allowlist hostnames; set widget action `contact`.
3. Verify SES sender identity; confirm recipient; leave sandbox or move out (sandbox only delivers to verified identities).
4. Deploy `infra/contact` (manual later); set production `contactApiUrl` / `turnstileSiteKey` / `contactEnabled`.
5. Replace CSP `connect-src` placeholder `https://contact-api.example.invalid` in `public/_headers` and `customHttp.yml`.
6. Amplify: connect repo, apply redirects from `amplify/redirects.json`, preview, then production.

### Expected AWS resources / cost review
- Amplify Hosting (static)
- API Gateway HTTP API
- Lambda
- SES (send)
- DynamoDB (on-demand + TTL)
- CloudWatch logs

Review free-tier / low-traffic estimates before apply. Hosting Amplify does **not** create the contact backend.

## Limitations / blockers

- 1.2.0 remains **unpublished**; UI badges say so; npm snippets still document 1.0.0/1.1.0.
- Production contact is intentionally non-operational until API + Turnstile + SES are configured.
- Initial bundle over Angular budget (~785 KB) — pre-existing weight from library/docs; not fixed in W6.2.
- Node.js 20 Lambda runtime is deprecated by AWS toward 2027-02; stack can take `-c lambdaRuntime=nodejs22.x`.

## Final procedure (after this stage)

1. Publish library **1.2.0** with the Stripe `/pure` fix.
2. Point the website at the published npm version.
3. Update the lockfile; remove `vendor/` + sync/ensure scripts when no longer needed.
4. Verify clean install, build, and all three demos.
5. Remove **Unpublished — 1.2.0** labels.
6. Configure Turnstile, SES, and deploy the contact backend.
7. Amplify preview → validate.
8. Deploy the final website.
