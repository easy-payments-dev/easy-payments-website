# Cloudflare Pages — deployment preparation (W6)

This project is prepared for **static** hosting on Cloudflare Pages.
W6 does **not** deploy, connect accounts, or change DNS.

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `npm run build:prod` |
| Build output directory | `dist/easy-payments-website/browser` |
| Node version | `22` (or current LTS supported by Angular 22) |
| Root directory | repository root (`easy-payments-website`) |

Do **not** publish `dist/easy-payments-website/server`. That folder is a build-time prerender artifact only. Cloudflare Pages must serve the **browser** output.

Run `npm run verify:static` after `build:prod` before upload. Do not run `npm run typecheck` afterward in the same workspace if you need an intact production `dist` artifact — typecheck writes to `dist/typecheck` to avoid clobbering production output.

## Canonical site URL

Production canonical origin is configured in:

- `src/environments/environment.production.ts` → `siteUrl`
- `public/robots.txt` → `Sitemap:`
- `scripts/generate-seo-assets.mjs` → `EP_SITE_URL` (optional override)

Confirm `https://easypayments.dev` matches the live hostname before launch. If the hostname differs, update those three places and rebuild.

## Routing

`public/_redirects` provides:

1. Docs entry redirects (`/docs`, `/docs/angular`, version roots) → published getting-started pages
2. `/playground` SPA fallback (`200` to `/index.html`) — client-rendered interactive demo
3. Catch-all SPA fallback for unknown routes

Prerendered routes (home, frameworks, security, published Angular docs) emit `…/index.html` files and are preferred by Cloudflare when present.

## Security headers

`public/_headers` sets:

- `Content-Security-Policy` (allows self, inline theme boot + Angular, Google Fonts)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (disables camera/mic/geo/payment APIs)
- Long-cache immutable hashed JS/CSS and brand assets; short-cache HTML

Re-test clipboard copy, theme boot, docs rendering, and fonts after any CSP tightening.

## Recommended W7 launch checklist

1. Confirm production hostname / TLS on Cloudflare.
2. Set Pages build command + output directory as above.
3. Deploy preview, then production.
4. Verify `/`, `/frameworks`, `/security`, a docs URL, `/playground`, `/sitemap.xml`, `/robots.txt`.
5. Hard-refresh docs deep links and playground direct loads.
6. Spot-check Light/Dark/System and mobile header.
7. Confirm no payment credentials exist in the repo or Pages env vars.
