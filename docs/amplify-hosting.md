# AWS Amplify Hosting — preparation (no deploy)

This repository is prepared to be hosted as a **static** site on AWS Amplify Hosting. Nothing here creates or
changes cloud resources: `amplify.yml`, `customHttp.yml`, and `amplify/redirects.json` are inert until you connect
the repository in the Amplify console.

> **Frontend hosting is not the contact backend.** Amplify serves the static Angular output only. The contact
> form talks to a separate API (API Gateway + Lambda + SES + DynamoDB) defined in `infra/contact/` and deployed on
> its own. Until that API exists and `src/environments/environment.production.ts` is configured, `/contact`
> shows a NOT OPERATIONAL notice and no form.

## Files

| File | Purpose |
| --- | --- |
| `amplify.yml` | Build spec: Node 22, `npm ci`, `npm run build:prod`, `npm run verify:static`, artifacts from `dist/easy-payments-website/browser` |
| `customHttp.yml` | Security + cache headers incl. CSP with Cloudflare Turnstile (Amplify equivalent of `public/_headers`) |
| `amplify/redirects.json` | Custom rewrite/redirect rules (Amplify equivalent of `public/_redirects`), kept outside `public/` so it is not published |

## Build

- **Node 22** (Angular 22). `amplify.yml` runs `nvm install 22 && nvm use 22`, then pins `npm@11.19.0` to match
  `package.json#packageManager`.
- `npm ci` installs strictly from `package-lock.json`.
- `@easy-payments/angular` is the **local, unpublished 1.2.0** package referenced as `file:vendor/easy-payments-angular`.
  **The `vendor/easy-payments-angular` directory must be committed** (at the time of writing it is untracked) or
  `npm ci` fails on Amplify. `scripts/ensure-vendor-angular.mjs` runs before the build to fail fast if it is missing.
  (`npm run build:prod` also triggers it through the `prebuild:prod` hook.)
- Do not serve `dist/easy-payments-website/server`; only the `browser` folder is the artifact.

## Redirects / SPA fallback

Amplify rules cannot be committed as a file that the service reads automatically; apply them once:

1. Amplify console → **Hosting → Rewrites and redirects → Open text editor**, paste `amplify/redirects.json`; or
2. `aws amplify update-app --app-id <id> --custom-rules file://amplify/redirects.json` (manual, later).

Rules in order:

1. `/docs`, `/docs/angular`, version roots → published getting-started pages (301)
2. `/playground` → `/index.html` **200 rewrite** (client-rendered)
3. `/contact` → `/index.html` **200 rewrite** (client-rendered; Turnstile needs the browser)
4. `</^[^.]+$/>` → `/index.html` **404-200** — only for extension-less paths that do not exist, so the Angular 404
   page can render; real files and static assets (anything with a `.`) are never rewritten to `index.html`

Prerendered routes (`/`, `/frameworks`, `/security`, published docs) are emitted as `…/index.html`. After the first
preview deploy, verify that `/frameworks` and a docs URL return **prerendered HTML** (view-source shows content)
rather than the SPA shell; if Amplify does not map directory URLs to `index.html` on your app, add explicit
`/<path>` → `/<path>/index.html` rewrites for those routes.

## Headers / CSP

`customHttp.yml` mirrors `public/_headers`:

- `script-src` / `frame-src` allow `https://challenges.cloudflare.com` for Turnstile (script is loaded dynamically,
  only on `/contact`).
- `connect-src` contains the placeholder `https://contact-api.example.invalid`. **Replace it with the deployed contact
  API origin** (scheme + host only) before enabling the form, in both `customHttp.yml` and `public/_headers`.
- HSTS is set because Amplify always serves HTTPS.

## Connect the repository (manual, later)

1. Amplify console → **Create new app → Host web app**, choose the Git provider and this repository + branch.
2. Amplify detects `amplify.yml` at the repository root; keep **Build image** default (Node is switched via nvm).
3. No environment variables are required for the static build. **Do not add secrets.** (Turnstile secret, IP-hash
   secret, and email settings belong to the backend stack, never to the website build.)
4. Review the generated settings and **Save and deploy**.

## Preview branches

- Hosting → **Branch settings / Previews**: enable pull-request previews (or per-branch auto-build) so each PR gets a
  preview URL.
- Previews use the same `environment.production.ts`. The preview origin is **not** in the contact API CORS allowlist or
  Turnstile hostname allowlist, so the contact form will not work on previews unless you add that origin to the
  backend (`allowedOrigins` context) and Turnstile widget domains. Leaving it off keeps previews safe.

## HTTPS and custom domain

- Amplify provisions an HTTPS `*.amplifyapp.com` URL automatically.
- Custom domain: Hosting → **Custom domains → Add domain**; Amplify issues an ACM certificate and gives DNS
  records to add (CNAME/ALIAS). Do not change DNS until you are ready to cut over.
- Keep `siteUrl` (`environment.production.ts`), `public/robots.txt`, and `EP_SITE_URL` aligned with the final hostname
  (`https://easypayments.dev` today), and use that origin in the backend `allowedOrigins` and the Turnstile widget's
  allowed domains.

## Checklist

1. Commit `vendor/easy-payments-angular`.
2. Connect the repo + branch; confirm the build passes (`verify:static` is part of the build).
3. Apply `amplify/redirects.json`.
4. Check `/`, `/frameworks`, a docs URL, `/playground`, `/contact` (NOT OPERATIONAL until the backend is configured), `/sitemap.xml`.
5. Deploy the contact backend separately (`infra/contact/README.md`), then set the production contact fields and replace the CSP placeholder.
