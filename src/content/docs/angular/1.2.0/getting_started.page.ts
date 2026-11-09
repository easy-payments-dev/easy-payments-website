import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'getting-started',
  slug: 'getting-started',
  title: 'Getting started',
  description: 'What Easy Payments is, requirements, and how to begin.',
  order: 10,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Getting started

Easy Payments for Angular (\`@easy-payments/angular\` **1.2.0**) is an open-source **integration library** for multi-provider checkout.

It helps your Angular app present Card, PayPal, Apple Pay, Google Pay, Klarna, and Affirm using **your** merchant accounts.

## What it is

- Standalone Angular APIs around provider SDKs (Full Checkout, Buttons Only, Headless)
- Normalized success / cancel / error events for UX
- Optional mock mode for local demos without real charges
- Built-in checkout localization (en / es / pt)

## What it is not

- Not a payment processor
- Not a bank or wallet provider
- Not a substitute for backend verification or webhooks
- Does **not** move money or hold funds

## Requirements

| Requirement | Detail |
|-------------|--------|
| Angular | \`>=20.3.0 <23.0.0\` |
| Package | \`@easy-payments/angular@1.2.0\` |
| Stripe JS | Peer \`@stripe/stripe-js\` (\`^8.0.0\` per published peer guidance) |
| Backend | HTTPS endpoints you control for create/capture/confirm flows |

Consumer installs were validated on Angular **20**, **21**, and **22** in mock-mode smoke tests.

## Modes in 1.2.0

| Surface | Public API | Guide |
|---------|------------|-------|
| **Full Checkout** | \`<easy-payments>\` | [Full Checkout](./full-checkout) |
| **Buttons Only** | \`<easy-payment-buttons>\` | [Buttons Only](./buttons-only) |
| **Headless** | \`EasyPaymentsHeadless\` | [Headless](./headless) |

See [Checkout modes](./checkout-modes). Common questions: [FAQ](/faq).

> Launch-review docs are validated against the local \`vendor/@easy-payments/angular@1.2.0\` package. The public install command is \`npm install @easy-payments/angular@1.2.0\`.

## Try the website playground

Use the [Angular Checkout Playground](/playground) to preview all three modes in mock mode. Klarna mock flows are labeled **DEMO**.

## Next steps

1. [Installation](./installation)
2. [Quick start](./quick-start) — first mock Full Checkout
3. [Checkout modes](./checkout-modes)
4. [Configuration](./configuration)
5. [Security](./security)
`,
};