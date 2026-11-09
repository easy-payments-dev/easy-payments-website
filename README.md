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
| `npm run contact:local` | Local mock contact API (`http://localhost:8787/contact`, no AWS/email) for `/contact` |
| `npm run contact:install` / `contact:test` / `contact:typecheck` | Install, test, and typecheck the contact backend in `infra/contact` |

## Notes

- The static site has no backend and no payment credentials. The `/contact` form uses a **separate** backend defined in `infra/contact/` (AWS CDK, not deployed); until configured, `/contact` shows a NOT OPERATIONAL notice. Hosting prep: `docs/cloudflare-pages.md`, `docs/amplify-hosting.md`.
- Playground is a labeled local simulation and never processes payments.
- Latest published Angular library version tracked by this site: **1.1.0**.
- Angular **1.2.0** remains unpublished / not documented as live.
- Deploy only `dist/easy-payments-website/browser` — see `docs/cloudflare-pages.md`.
