# Easy Payments Website

Official marketing and documentation website for the Easy Payments ecosystem.

## Stack

- Angular 22 standalone application
- Static prerender (`outputMode: static`) for public crawlable routes
- Client-rendered Angular Checkout Playground (simulation only)
- TypeScript strict mode + SCSS
- Cloudflare Pages compatible static output

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Local development server |
| `npm run build:prod` | Generate SEO assets + production static build |
| `npm run seo:assets` | Regenerate `sitemap.xml` / `prerender-routes.txt` |
| `npm test` | Unit tests |
| `npm run test:ci` | Unit tests once (CI) |
| `npm run typecheck` | Development build / TypeScript check |
| `npm run verify:static` | Inspect production `browser` output |
| `npm run verify:playground-api` | Isolated compile against published Angular 1.0.0 / 1.1.0 |

## Notes

- No custom backend and no payment credentials.
- Playground is a labeled local simulation and never processes payments.
- Latest published Angular library version tracked by this site: **1.1.0**.
- Angular **1.2.0** remains unpublished / not documented as live.
- Deploy only `dist/easy-payments-website/browser` — see `docs/cloudflare-pages.md`.
