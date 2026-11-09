# W6.4.1 — Launch preview polish (local review)

Stop point: local review only. No npm publish, push, or Amplify deploy.

## Preview URLs

| Surface | URL |
| --- | --- |
| Full Checkout | http://127.0.0.1:4200/playground?demo=full |
| Buttons Only | http://127.0.0.1:4200/playground?demo=buttons |
| Headless | http://127.0.0.1:4200/playground?demo=headless |
| Checkout Modes | http://127.0.0.1:4200/docs/angular/1.2.0/checkout-modes |
| Library demo (reference) | http://127.0.0.1:4300/ |

## Headless root cause

**Symptom:** `/playground?demo=headless` → Affirm (and other methods) threw `BACKEND_ERROR: affirmCreatePaymentUrl is not configured` (PayPal similarly hit `CONFIG_MISSING`).

**Cause (library):** Headless mock availability reported DEMO / mock interaction, but `mount()` / `confirm()` still delegated to real provider adapters. Those adapters require backend URLs (`affirmCreatePaymentUrl`, PayPal order endpoints, Stripe keys). Full Checkout / Buttons Only already routed mock payments through the orchestrator registry; Headless did not.

**Fix (library, then vendored):**

1. Added a Headless mock surface (`headless-mock-surface.ts`) that renders DEMO UI into the merchant container.
2. `EasyPaymentsHeadless` session `mountMock()` / confirm paths call `orchestrator.processPayment` for mock methods — no payment endpoints, no provider SDKs.
3. Documented in `easy-payments-angular/docs/headless.md` (Mock mode section).
4. Covered by `headless-mock.spec.ts`.
5. Rebuilt and synced into `vendor/easy-payments-angular` (`@easy-payments/angular@1.2.0`).

**Website verification:** Every enabled DEMO method succeeds / cancels / fails via `MockPaymentController`. One user action → one terminal event log entry (`success` | `cancel` | `error`) plus `started`. No `BACKEND_ERROR`. Resource timing / `verify:mock-network` show no payment SDK hosts.

## Buttons Only mismatch

**Cause:** Website Playground defaulted `[layout]` to `vertical`. In vertical layout, Card / Klarna / Affirm selectors stretch to full strip width while wallet mock buttons keep intrinsic / min width — looking like mixed sizes. Library demo defaults to `horizontal` with equal `160×40` item slots, `gap: 8px`, `buttonHeight: 40px`, `buttonMinWidth: 100px`.

**Fix:** Default Playground (and codegen) layout to `horizontal`; keep shared `[buttonsAppearance]` (no per-method CSS). Measured after fix: all six `__item` slots `160×40`, matching the library demo.

## Checkout Modes + badge

- Six-column table replaced by three comparison cards (when / who owns UI / public API + Try demo / View guide).
- Docs badge shows plain **1.2.0** (not “Latest published”) while npm publication is pending.
- Home / Frameworks version copy also uses plain version wording.

## Checks run

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run build:prod` | pass (existing initial-bundle budget warning) |
| `npm run verify:static` | pass (72 `index.html`) |
| `PLAYGROUND_BASE_URL=http://127.0.0.1:4200 npm run verify:mock-network` | pass |

## Screenshots

Saved under `docs/w641-screenshots/`:

- `before-buttons-only-website.png` / `after-buttons-only-website.png`
- `after-buttons-only-mobile-390.png`
- `after-headless-website.png` / `after-headless-affirm-success.png`
- `after-checkout-modes.png`
