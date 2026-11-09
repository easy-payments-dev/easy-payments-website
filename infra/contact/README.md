# Contact form backend (AWS CDK)

Backend for the website `/contact` form. It is **separate from the static frontend** (Amplify
Hosting today; Cloudflare Pages files remain for reference) and is **defined here but not deployed**.
Nothing in this folder creates cloud resources until you run `cdk deploy` yourself.

Live website origin: **`https://www.easy-payments.dev`** (AWS Amplify). Until this stack is deployed
and the frontend is wired (see [Activate production contact](#activate-production-contact-manual)),
`contactEnabled` stays **`false`** and `/contact` keeps the NOT OPERATIONAL notice with GitHub as
the available contact path.

```
Browser (/contact + Turnstile)
   │  POST JSON  +  Idempotency-Key
   ▼
API Gateway HTTP API  POST /contact  (CORS: configured website origins only, edge throttle 5 rps / burst 10)
   ▼
Lambda (Node 20/22, arm64)  ── Cloudflare Turnstile siteverify
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

## Production deploy (manual — NOT run by this repo state)

### Prerequisites

| Item | Detail |
| --- | --- |
| AWS credentials | Account with permission to create API Gateway HTTP API, Lambda, DynamoDB, IAM, CloudWatch Logs, and read SSM |
| Region | **`us-east-1`** (matches `.env.example` `SES_REGION`; SES sandbox identity verification and deliverability are simplest here). Set both: `$env:AWS_REGION='us-east-1'; $env:CDK_DEFAULT_REGION='us-east-1'` |
| CDK bootstrap | Once per account/region: `npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1` |
| SES sender | A **verified** SES identity for `fromEmail` (email address **or** domain). Example for this site: `no-reply@easy-payments.dev` once that identity (or the `easy-payments.dev` domain) is verified in SES |
| SES recipient | Default **`jantvb@gmail.com`**. While the account is in the **SES sandbox**, verify this address in SES (or request production access) before real sends succeed |
| Cloudflare Turnstile | Widget allowed for **`www.easy-payments.dev`** (and optionally `easy-payments.dev` if you ever serve apex), action name **`contact`**. Secret stays in AWS SSM; only the **site key** goes in the website |

Preserved by design (do not weaken): honeypot field `website`, server-side validation limits, per-IP attempt/submission windows, daily send cap, idempotency, and Turnstile hostname/action/age checks.

### CDK context parameter names

Passed as `-c key=value` to `cdk synth|diff|deploy` (`bin/contact.ts`):

| Context key | Required | Default | Production value for Easy Payments |
| --- | --- | --- | --- |
| `fromEmail` | **yes** | — | Your verified SES sender, e.g. `no-reply@easy-payments.dev` |
| `allowedOrigins` | **yes** | — | `https://www.easy-payments.dev` (comma-separated if several; https, no path, no `*`) |
| `stage` | no | `prod` | `prod` (stack id `EasyPaymentsContact-prod`; `local`/`test` refused) |
| `toEmail` | no | `jantvb@gmail.com` | `jantvb@gmail.com` |
| `sesIdentity` | no | same as `fromEmail` | Verified SES identity name (use the **domain** if the domain identity authorizes `fromEmail`) |
| `dailySendCap` | no | `50` | `50` unless you intentionally raise it |
| `turnstileSecretParam` | no | `/easy-payments/contact/<stage>/turnstile-secret` | `/easy-payments/contact/prod/turnstile-secret` |
| `ipHashSecretParam` | no | `/easy-payments/contact/<stage>/ip-hash-secret` | `/easy-payments/contact/prod/ip-hash-secret` |
| `lambdaRuntime` | no | `nodejs20.x` | Prefer **`nodejs22.x`** for new deploys (Node 20 create blocked after 2027-02-01) |

Stack output used by the website: **`ContactApiUrl`** → full `https://…/contact` URL.

### Cloudflare Turnstile (www.easy-payments.dev)

1. Cloudflare Dashboard → Turnstile → **Add widget**.
2. Domains / hostnames: **`www.easy-payments.dev`** (add apex only if you also serve it).
3. Widget mode: managed (or non-interactive if you prefer); note the **Site key** (public) and **Secret key** (backend only).
4. The website posts Turnstile with action **`contact`** — keep that action name; the Lambda expects
   `TURNSTILE_EXPECTED_ACTION=contact` (default).
5. Hostname allowlist on the API defaults to the hostnames of `allowedOrigins`
   (`www.easy-payments.dev`). Override with Lambda env `TURNSTILE_ALLOWED_HOSTNAMES` only if needed.
6. Put the **secret** in SSM (below). Put the **site key** only in `environment.production.ts`
   (`turnstileSiteKey`) when activating — never commit the secret.

### SES identities

```powershell
# Sender (required) — address OR verify the easy-payments.dev domain in SES instead
aws sesv2 create-email-identity --email-identity no-reply@easy-payments.dev --region us-east-1
# Complete the verification email / DNS as SES instructs.

# Sandbox only: also verify the fixed recipient before real mail is accepted
aws sesv2 create-email-identity --email-identity jantvb@gmail.com --region us-east-1
# Confirm via the Gmail verification message from AWS.

# When ready for arbitrary recipients, request SES production access in the console.
```

`Reply-To` is always the visitor’s validated email from the form body; it is never used as `From`.

### Exact deploy commands

```powershell
# 0) Region + account (example)
$env:AWS_REGION = 'us-east-1'
$env:CDK_DEFAULT_REGION = 'us-east-1'
# $env:CDK_DEFAULT_ACCOUNT = '<ACCOUNT_ID>'   # optional if already implied by credentials

# 1) Secrets in SSM SecureString (never in git, Amplify env, or CDK context)
aws ssm put-parameter --region us-east-1 `
  --name /easy-payments/contact/prod/turnstile-secret `
  --type SecureString --value "<Turnstile secret key>"
aws ssm put-parameter --region us-east-1 `
  --name /easy-payments/contact/prod/ip-hash-secret `
  --type SecureString --value "<openssl rand -hex 32>"

# 2) Install, synthesize, review
cd infra/contact
npm ci
npx cdk synth `
  -c fromEmail=no-reply@easy-payments.dev `
  -c allowedOrigins=https://www.easy-payments.dev `
  -c toEmail=jantvb@gmail.com `
  -c lambdaRuntime=nodejs22.x
npx cdk diff `
  -c fromEmail=no-reply@easy-payments.dev `
  -c allowedOrigins=https://www.easy-payments.dev `
  -c toEmail=jantvb@gmail.com `
  -c lambdaRuntime=nodejs22.x

# 3) Deploy when you are ready (creates API Gateway + Lambda + DynamoDB + IAM)
npx cdk deploy `
  -c fromEmail=no-reply@easy-payments.dev `
  -c allowedOrigins=https://www.easy-payments.dev `
  -c toEmail=jantvb@gmail.com `
  -c lambdaRuntime=nodejs22.x
# Note the ContactApiUrl stack output (https://….execute-api.us-east-1.amazonaws.com/contact).
```

If the verified SES identity is the **domain** `easy-payments.dev` rather than the mailbox, add
`-c sesIdentity=easy-payments.dev` while keeping `-c fromEmail=no-reply@easy-payments.dev`.

To change only the recipient later: redeploy with `-c toEmail=...` (or edit Lambda env
`CONTACT_TO_EMAIL`). The website does not change.

### IAM (least privilege)

Lambda role: `dynamodb:UpdateItem|PutItem|GetItem` on the guard table only; `ses:SendEmail` on the sender identity (and
recipient identity, required while SES is in the sandbox) with condition `ses:FromAddress = CONTACT_FROM_EMAIL`;
`ssm:GetParameter` on the two secret parameters; plus the default CloudWatch Logs permissions. No `Scan`, `Delete`,
wildcard resources, or `ses:SendRawEmail`.

### Known limitations

- Fixed-window rate limiting allows up to 2× the limit across a window boundary.
- Shared NAT/office IPs share one bucket.
- The API Gateway default execute-api URL stays enabled until a custom domain is attached (optionally disable it then).

## Activate production contact (manual)

Keep **`contactEnabled: false`** until every step below is done and smoke-tested. Do not enable the form against
the CSP placeholder.

### Where each production value is set

| Concern | Where | What to set |
| --- | --- | --- |
| CORS / browser origin | CDK `-c allowedOrigins=` → Lambda `CONTACT_ALLOWED_ORIGINS` | `https://www.easy-payments.dev` |
| Turnstile secret | SSM `/easy-payments/contact/prod/turnstile-secret` | Secret key only (backend) |
| Turnstile public site key | `src/environments/environment.production.ts` → `turnstileSiteKey` | Site key string |
| Contact API URL | same file → `contactApiUrl` | Exact `ContactApiUrl` output (must be `https://…/contact`) |
| Enable form | same file → `contactEnabled` | Flip to `true` **last**, after API + Turnstile + CSP work |
| Transport | same file → `contactTransport` | Keep `'api'` (local-mock is rejected in production builds) |
| CSP `connect-src` | `customHttp.yml` **and** `public/_headers` | Replace `https://contact-api.example.invalid` with the API **origin only** (scheme + host, no `/contact` path) |
| Amplify hosting | Amplify redeploy of the website branch after the frontend/CSP commit | Serves the updated env + headers |

Frontend resolution logic: `src/app/features/contact/contact.config.ts` (`resolveContactConfig`). Security headers
notes: `docs/amplify-hosting.md`, `customHttp.yml`, `public/_headers`.

### Post-deploy browser checklist

From **`https://www.easy-payments.dev/contact`** (not a preview URL unless that origin was also allowlisted):

1. Page shows the live form (not NOT OPERATIONAL) once `contactEnabled` is true and Amplify has deployed.
2. Turnstile widget loads from `challenges.cloudflare.com` and completes without console CSP errors.
3. Submit a real message with your own reply email; expect HTTP **200** `{"status":"accepted"}` in Network.
4. Confirm mail arrives in **`jantvb@gmail.com`** (check spam). Subject like `[Easy Payments] Inquiry`.
5. Open the message: **To** is `jantvb@gmail.com`, **From** is the verified SES sender, **Reply-To** is the
   visitor address you typed.
6. Submit the same content again with the **same** Idempotency-Key (browser retries) → accepted without a second SES
   send when applicable; submit **4** distinct successful attempts quickly → expect **429**.
7. CloudWatch logs for the contact Lambda show outcome/status only — **no** message body, email, IP, or Turnstile token.
8. Optional: fill the hidden honeypot → still 200 accepted, **no** email.
