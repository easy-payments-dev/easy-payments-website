# W6.4.2 — Uniform Buttons Only mock sizing

Local review only. No publish / push / deploy.

## Root cause

Git comparison of `easy-payment-buttons` + `easy-mock-method-panel` showed:

1. Horizontal slots were already equal (`flex: 0 1 var(--ep-buttons-slot-width, 160px)`).
2. Card / Klarna / Affirm **selectors** fill the slot with `width: 100%`.
3. PayPal / Apple Pay / Google Pay **mock** strips live inside `.ep-payment-buttons__mock` (`display: flex`). The `easy-mock-method-panel` host was `display: block` **without** `width: 100%`, so as a flex child it shrink-wrapped to the logo. Strip `width: 100%` then resolved against that shrink-wrapped host → wallets measured ~100–116px while selectors stayed 160px.
4. Strip CSS also capped brand marks at 22px, crushing Apple/Google acceptance marks that are meant to render taller.

Live `__express` SDK mounts were not changed.

## Fix (library → vendored)

| File | Change |
| --- | --- |
| `mock-method-panel.component.ts` | `:host { width: 100% }`; strip uses `display: flex`; allow mark height up to strip height − 8px |
| `easy-payment-buttons.component.scss` | `.ep-payment-buttons__mock > * { width: 100%; flex: 1 1 auto }`; relax mark max-height |
| `easy-payment-buttons.component.spec.ts` | Assert all six clickable buttons share one width/height (160×40) |

Synced with `npm run sync:lib:build` into `vendor/easy-payments-angular@1.2.0`. Website Playground already uses the same public `[layout]` / `[buttonsAppearance]` defaults.

## Measured clickable buttons

Values from `getBoundingClientRect` on `button.ep-payment-buttons__selector` / `button.ep-mock-panel__strip` (not slots).

### Website Playground — desktop (~977px), light + dark

| Method | Width | Height |
| --- | ---: | ---: |
| Card | 160 | 40 |
| PayPal | 160 | 40 |
| Apple Pay | 160 | 40 |
| Google Pay | 160 | 40 |
| Klarna | 160 | 40 |
| Affirm | 160 | 40 |

### Website Playground — narrow host 358px (~390 content)

Container query → two equal columns (`flex-basis: calc(50% - 4px)`):

| Method | Width | Height |
| --- | ---: | ---: |
| All six | 175 | 40 |

### Library demo — desktop (`http://127.0.0.1:4300/`, Buttons Only)

| Method | Width | Height |
| --- | ---: | ---: |
| All six | 160 | 40 |

## Mock flows

Clicked each enabled method on the website Playground: each produced `started` + one terminal `success` (MockPaymentController = success). Headless mock path untouched. Live express paths untouched.

## Checks

- Library `easy-payment-buttons.component.spec.ts`: 93 SUCCESS (includes new equal-size test)
- `PLAYGROUND_BASE_URL=http://127.0.0.1:4200 npm run verify:mock-network`: pass

## Preview URLs

- Website: http://127.0.0.1:4200/playground?demo=buttons
- Library: http://127.0.0.1:4300/ (Experience → Payment Buttons Only)

## Screenshots

`docs/w642-screenshots/` — before (uneven wallets) vs after (website dark/light, narrow, library demo).
