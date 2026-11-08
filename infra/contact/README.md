# Contact form backend (AWS CDK)

Backend for the website `/contact` form. It is **separate from the static frontend** (Cloudflare Pages or Amplify
Hosting) and is **defined here but not deployed**. Nothing in this folder creates cloud resources until you run
`cdk deploy` yourself.

```
Browser (/contact + Turnstile)
   │  POST JSON  +  Idempotency-Key
   ▼
API Gateway HTTP API  POST /contact  (CORS: configured website origins only, edge throttle 5 rps / burst 10)
   ▼
Lambda (Node 20, arm64)  ── Cloudflare Turnstile siteverify
   ├─ DynamoDB  rate limits · daily cap · idempotency (TTL cleanup)
   └─ SES v2    SendEmail (plain text) → fixed recipient
```

Infrastructure is **AWS CDK (TypeScript)** — the repo had no existing IaC convention.

## Layout

| Path | What |
| --- | --- |
| `bin/contact.ts`, `lib/contact-stack.ts` | CDK app + stack (HTTP API, Lambda, DynamoDB table, least-privilege IAM) |
| `lambda/handler.ts` | Request pipeline (pure; dependencies injected) |
| `lambda/validation.ts` | Field validation + honeypot detection |
| `lambda/turnstile.ts` | siteverify with hostname/action/age checks |
| `lambda/rate-limit.ts` | HMAC-SHA256 IP hashing, windows, keys |
| `lambda/idempotency.ts` | Key parsing, store keys, content fingerprint |
| `lambda/config.ts` | Env validation incl. production guards |
| `lambda/store.ts` · `dynamo-store.ts` · `memory-store.ts` | Guard store interface · DynamoDB · in-memory (tests only) |
| `lambda/email.ts` · `ses-transport.ts` | Message builder + `local-mock` sink · SES v2 transport |
| `lambda/index.ts` | Lambda entry (wiring only) |
| `test/*.test.ts` | Vitest unit tests (validation, honeypot, hashing, idempotency, config guards, Turnstile, handler) |
| `.env.example` | Variable reference (no real secrets) |

## Behavior

Request pipeline (cheap → expensive):

1. Config must be complete, otherwise **500 `server_error`** — never a fake success.
2. `Origin` must be in `CONTACT_ALLOWED_ORIGINS` (else 403). Preflight handled the same way.
3. **Per-IP attempt counter** (default 10 / 15 min) counts *every* request, including malformed, bot, and
   Turnstile-failed ones → **429**.
4. `Content-Type: application/json` (415), `Idempotency-Key` must be a UUID (400), body ≤ 32 KB (413), valid JSON,
   fields validated with the same limits as the form: name ≤ 100, email ≤ 254 (format), message ≤ 3000,
   `type` ∈ suggestion|problem|inquiry|other. Errors return field **codes only**, never echoed content.
5. **Honeypot** (`website` field filled) → **HTTP 200 `{"status":"accepted"}`** — identical to real success — with no
   email, no Turnstile call, no stored result. *Choice:* generic success rather than 204 so a bot cannot tell the
   difference by status or body. The request still counts against the attempt limit.
6. **Idempotency claim** (below).
7. **Turnstile siteverify**: success required, `hostname` ∈ allowlist (defaults to the hostnames of the allowed
   origins), `action` = `contact`, challenge age ≤ 300 s. Invalid/expired/**reused** tokens (`timeout-or-duplicate`)
   → **403 `verification_failed`**. If Cloudflare is unreachable → **503** (fail closed; there is no bypass).
8. **Per-IP submission limit**: **3 per IP per 15 min** (fixed window, atomic DynamoDB `UpdateItem` with a condition)
   → **429 + `Retry-After`**. Keys are `HMAC-SHA256(ip, IP_HASH_SECRET)`; the raw IP is never stored or logged.
9. **Global daily cap**: `DAILY_SEND_CAP` (default **50** SES attempts per UTC day) → **503**.
10. **SES `SendEmail`**. Success is returned only when SES **accepts** the message (not "delivered").
11. Result recorded for idempotent replay.

Email: `To` = `CONTACT_TO_EMAIL` (server config only; the client can never choose a recipient — default
`jantvb@gmail.com`, changeable without any UI/website change). `From` = `CONTACT_FROM_EMAIL` (a verified SES identity).
`Reply-To` = the visitor's address (validated header-safe; never used as `From`). Subject = `[Easy Payments] <label>`
built server-side from the allowlisted type. Body is **plain text** (no HTML, so nothing to escape). No automatic
reply is sent to the visitor.

### Idempotency, retries, and SES semantics

- The browser sends a UUID `Idempotency-Key` and **reuses it for identical retries**, with a new key when content
  changes. The same key + same content returns the stored result (`Idempotent-Replay: true`) **without a second SES
  send**. Same key + different content → 422. A concurrent duplicate → 409 (`Retry-After: 2`).
- Only **final success** is stored (24 h TTL). Failures (Turnstile, rate limit, cap, SES error) **release** the claim so a
  retry with the same key can succeed.
- Delivery is **at-most-once, best effort**. If SES accepts a message but the Lambda crashes or the response is lost
  before the result is recorded, the claim's 60 s lock expires and a retry may send again. If SES errors, nothing was
  accepted and a retry is safe. **SES acceptance is not a guarantee of inbox delivery, and idempotency is not an
  exactly-once guarantee** — it prevents duplicates from ordinary client retries, nothing more.
- Rate-limit/cap slots are consumed *before* sending and are not refunded on SES failure (abuse protection).

### Local email transport guard

`CONTACT_EMAIL_TRANSPORT=local-mock` writes to an in-memory/console sink and never calls SES. It is **refused** unless
`STAGE` is `local` or `test` **and** `NODE_ENV` is not `production`. An unset/blank `STAGE` is treated as production.
The CDK stack never exposes this option and always sets `STAGE=<stage>`, `NODE_ENV=production`,
`CONTACT_EMAIL_TRANSPORT=ses`, so a deployed function cannot use it. Config also refuses, in production-like stages,
Cloudflare's dummy Turnstile secrets and non-`https` origins. Incomplete config returns an error, not success.

### Logging

Structured JSON with outcome, status, request id, and error *names/codes*. The message, name, email addresses,
raw IP, and Turnstile token are **never** logged (covered by tests).

### HTTP status summary

`200` accepted (or honeypot) · `400` invalid request/key · `403` origin or verification failed · `409` duplicate in
progress · `413` body too large · `415` not JSON · `422` key reused with different content · `429` rate limited ·
`500` server misconfigured · `502` SES rejected · `503` temporarily unavailable (Turnstile down, daily cap, store error).

## Local development

```powershell
# from the website root
npm run contact:local        # local mock API on http://localhost:8787/contact (no AWS, no email)
npm start                    # Angular dev server; /contact uses the mock + Turnstile test key
```

`scripts/local-contact-api.mjs` validates tokens against Cloudflare siteverify with the official **test secret**
(`1x0000000000000000000000000000000AA`, pairs with site key `1x00000000000000000000AA`; always passes), uses the console
email sink, implements honeypot/validation/idempotency, and rate-limits in memory (3 / 15 min, resets on restart). It
refuses to run with `NODE_ENV=production` or a non-local `STAGE`. Set `CONTACT_LOCAL_PRINT_BODY=1` to print captured
messages.

Backend unit tests (no AWS needed):

```powershell
cd infra/contact
npm ci
npm test            # vitest
npm run typecheck
```

## Deploy (manual, later — NOT done by this repo state)

Prerequisites: AWS account/credentials, CDK bootstrapped in the target account/region, a **verified SES identity**
(address or domain) for the sender. A new SES account is in the **sandbox**: the recipient (`jantvb@gmail.com`) must
also be verified, or request production access. Create a Cloudflare Turnstile widget with allowed domain(s) matching the
website hostname(s) and action `contact`.

1. **Secrets** (SSM Parameter Store, `SecureString`; never in code or CDK):
   ```powershell
   aws ssm put-parameter --name /easy-payments/contact/prod/turnstile-secret --type SecureString --value "<Turnstile secret key>"
   aws ssm put-parameter --name /easy-payments/contact/prod/ip-hash-secret   --type SecureString --value "<random >=32 chars>"
   ```
2. **Install and review**:
   ```powershell
   cd infra/contact
   npm ci
   npx cdk synth -c fromEmail=no-reply@easypayments.dev -c allowedOrigins=https://easypayments.dev
   npx cdk diff  -c fromEmail=no-reply@easypayments.dev -c allowedOrigins=https://easypayments.dev
   ```
3. **Deploy** (when ready):
   ```powershell
   npx cdk deploy -c fromEmail=no-reply@easypayments.dev -c allowedOrigins=https://easypayments.dev
   ```
   Optional context: `stage` (default `prod`; `local`/`test` are refused), `toEmail` (default `jantvb@gmail.com`),
   `sesIdentity` (default = `fromEmail`; use the domain if the domain is the verified identity), `dailySendCap` (50),
   `turnstileSecretParam`, `ipHashSecretParam`, `lambdaRuntime` (`nodejs20.x` default; `nodejs22.x` supported).
   > Node 20 is the requested runtime. AWS is deprecating `nodejs20.x` (deprecated 2026-04-30; create blocked
   > 2027-02-01), so prefer `-c lambdaRuntime=nodejs22.x` for a new deployment.
4. **Wire the website** (public values only) from the `ContactApiUrl` stack output and the Turnstile **site key**:
   in `src/environments/environment.production.ts` set `contactApiUrl`, `turnstileSiteKey`, `contactEnabled: true`
   (keep `contactTransport: 'api'`).
5. **CSP**: replace `https://contact-api.example.invalid` in `public/_headers` (and `customHttp.yml` for Amplify) with the
   API origin.
6. Smoke test from the production origin: submit once (expect an email to `CONTACT_TO_EMAIL`), submit 4× quickly
   (expect 429), confirm CloudWatch logs contain no message/email/token.

To change the recipient: redeploy with `-c toEmail=...` (or edit the Lambda env var `CONTACT_TO_EMAIL`). The website
does not change.

### IAM (least privilege)

Lambda role: `dynamodb:UpdateItem|PutItem|GetItem` on the guard table only; `ses:SendEmail` on the sender identity (and
recipient identity, required while SES is in the sandbox) with condition `ses:FromAddress = CONTACT_FROM_EMAIL`;
`ssm:GetParameter` on the two secret parameters; plus the default CloudWatch Logs permissions. No `Scan`, `Delete`,
wildcard resources, or `ses:SendRawEmail`.

### Known limitations

- Fixed-window rate limiting allows up to 2× the limit across a window boundary.
- Shared NAT/office IPs share one bucket.
- The API Gateway default execute-api URL stays enabled until a custom domain is attached (optionally disable it then).
