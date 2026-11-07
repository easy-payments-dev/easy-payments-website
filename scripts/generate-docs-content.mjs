import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src/content/docs/angular';

function page(meta, markdown) {
  return { ...meta, markdown: markdown.trim() + '\n' };
}

function writeVersion(version, pages) {
  const dir = join(root, version);
  mkdirSync(dir, { recursive: true });
  const exports = [];
  for (const p of pages) {
    const file = `${p.id.replace(/-/g, '_')}.page.ts`;
    const body = `import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = ${JSON.stringify(p, null, 2)};
`;
    writeFileSync(join(dir, file), body);
    exports.push({ id: p.id, file: file.replace(/\.ts$/, '') });
  }
  const index = `import { DocsPageMeta } from '../../../../app/core/docs/docs.types';
${exports.map((e, i) => `import { page as p${i} } from './${e.file}';`).join('\n')}

export const pages: readonly DocsPageMeta[] = [
${exports.map((_, i) => `  p${i},`).join('\n')}
];
`;
  writeFileSync(join(dir, 'index.ts'), index);
  console.log(version, pages.length);
}

const sharedGroups = {
  start: { groupId: 'getting-started', groupTitle: 'Getting started' },
  config: { groupId: 'configuration', groupTitle: 'Configuration' },
  integrations: { groupId: 'integrations', groupTitle: 'Integrations' },
  guides: { groupId: 'guides', groupTitle: 'Guides' },
  reference: { groupId: 'reference', groupTitle: 'Reference' },
};

function basePages(version, extras = []) {
  const note110 =
    version === '1.1.0'
      ? '\n\n> **1.1.0 note:** This release adds UI localization via `[locale]` and `[translations]`. See [Localization](./localization).'
      : '\n\n> **Evidence note:** Documented from the 1.0.0 CHANGELOG and current library docs. Exact frozen 1.0.0 TypeScript trees were not available locally without git/npm tarballs; APIs below match the first stable release narrative and the Full Checkout surface that pre-dates 1.1 localization and 1.2 Headless/Buttons Only additions.';

  const localeInputs =
    version === '1.1.0'
      ? `
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` | UI locale (default \`auto\`) |
| \`translations\` | partial map | Optional string overrides |`
      : '';

  const localeApiRows =
    version === '1.1.0'
      ? `| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | partial overrides |`
      : '';

  const pages = [
    page(
      {
        id: 'getting-started',
        slug: 'getting-started',
        title: 'Getting started',
        description: 'What Easy Payments is, requirements, and how to begin.',
        order: 10,
        ...sharedGroups.start,
      },
      `
# Getting started

Easy Payments for Angular (\`@easy-payments/angular\` **${version}**) is an open-source **integration library** for multi-provider checkout.

It helps your Angular app present Card, PayPal, Apple Pay, Google Pay, Klarna, and Affirm using **your** merchant accounts.

## What it is

- A standalone Angular component API around provider SDKs
- Normalized success / cancel / error events for UX
- Optional mock mode for local demos without real charges

## What it is not

- Not a payment processor
- Not a bank or wallet provider
- Not a substitute for backend verification or webhooks
- Does **not** move money or hold funds

## Requirements

| Requirement | Detail |
|-------------|--------|
| Angular | \`>=20.3.0 <23.0.0\` |
| Package | \`@easy-payments/angular@${version}\` |
| Stripe JS | Peer \`@stripe/stripe-js\` (\`^8.0.0\` per published peer guidance) |
| Backend | HTTPS endpoints you control for create/capture/confirm flows |

Consumer installs were validated on Angular **20**, **21**, and **22** in mock-mode smoke tests.

## Published experience

Version **${version}** documents the **Full Checkout** experience (\`<easy-payments>\`).

Buttons Only and Headless checkout modes belong to the **1.2.0** release candidate and are **not** part of published ${version} documentation.
${note110}

## Next steps

1. [Installation](./installation)
2. [Quick start](./quick-start)
3. [Configuration](./configuration)
4. [Security](./security)
`,
    ),

    page(
      {
        id: 'installation',
        slug: 'installation',
        title: 'Installation',
        description: 'Install the published Angular package and peers.',
        order: 20,
        ...sharedGroups.start,
      },
      `
# Installation

Install the published package and Stripe.js peer:

\`\`\`bash
npm install @easy-payments/angular@${version} @stripe/stripe-js
\`\`\`

## Peer dependencies

| Package | Range |
|---------|-------|
| \`@angular/core\` | \`>=20.3.0 <23.0.0\` |
| \`@angular/common\` | \`>=20.3.0 <23.0.0\` |
| \`@stripe/stripe-js\` | \`^8.0.0\` |

## App providers

Easy Payments is **standalone-only** (no NgModule). Register HTTP and Easy Payments in your application config:

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_your_key' },
        // Add PayPal / wallets / BNPL only when configured
      },
      // enableMockMode: true // local demos only — never in production
    }),
  ],
};
\`\`\`

## Credentials

| Allowed in Angular | Never in Angular |
|--------------------|------------------|
| Stripe **publishable** key (\`pk_test_\` / \`pk_live_\`) | Stripe **secret** key (\`sk_\`) |
| PayPal **Client ID** | PayPal **Client Secret** |
| Public merchant display names | Webhook secrets (\`whsec_\`) |
| Your HTTPS backend URLs | Access tokens / private keys |

See [Security](./security).
`,
    ),

    page(
      {
        id: 'quick-start',
        slug: 'quick-start',
        title: 'Quick start',
        description: 'Minimal Full Checkout integration.',
        order: 30,
        ...sharedGroups.start,
      },
      `
# Quick start

Render Full Checkout with a product and method list.

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentMethod,
  PaymentProduct,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
    />
  \`,
})
export class CheckoutComponent {
  readonly product: PaymentProduct = {
    id: 'premium',
    name: 'Premium Plan',
    amount: 99,
    currency: 'USD',
  };

  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];

  onSuccess(result: unknown): void {
    // UX only — fulfill after backend / webhook verification
  }

  onCancel(result: unknown): void {}
  onError(error: unknown): void {}
}
\`\`\`

## Amounts

\`product.amount\` uses **major units** (for example \`99\` means $99.00), not the smallest currency subunit.

## Success events

Browser \`success\` is a **UX signal**. Do not fulfill orders from client events alone. Verify PaymentIntent / capture status on your server or via provider webhooks.
`,
    ),

    page(
      {
        id: 'configuration',
        slug: 'configuration',
        title: 'Configuration',
        description: 'Providers, backend URLs, and checkout options.',
        order: 40,
        ...sharedGroups.config,
      },
      `
# Configuration

Configure Easy Payments once with \`provideEasyPayments\`.

## EasyPaymentsConfig

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    paypal: { clientId: 'your-paypal-client-id', currency: 'USD', intent: 'capture' },
    applePay: { merchantName: 'Your Store', countryCode: 'US' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
    klarna: { purchaseCountry: 'US' },
    affirm: { purchaseCountry: 'US' },
  },
  backend: {
    baseUrl: 'https://api.example.com',
    createPaymentUrl: '/api/payments/create',
    paypalCreateOrderUrl: '/api/paypal/orders',
    paypalCaptureOrderUrl: '/api/paypal/capture',
    klarnaCreatePaymentUrl: '/api/klarna/create',
    affirmCreatePaymentUrl: '/api/affirm/create',
  },
  enableMockMode: false,
});
\`\`\`

### Provider config fields

| Provider key | Notable fields |
|--------------|----------------|
| \`stripe\` | \`publishableKey\` |
| \`paypal\` | \`clientId\`, optional \`currency\`, \`intent\` (\`capture\` \\| \`authorize\`) |
| \`applePay\` | \`merchantName\`, \`countryCode\` (\`merchantId\` is deprecated/ignored) |
| \`googlePay\` | \`merchantId?\`, \`merchantName?\`, \`environment\` (\`TEST\` \\| \`PRODUCTION\`), \`countryCode?\` |
| \`klarna\` | \`purchaseCountry?\`, \`locale?\` |
| \`affirm\` | \`purchaseCountry?\`, \`locale?\` |

### Backend URLs

Optional \`backend\` fields point at **your** HTTPS API. Easy Payments does not host payment APIs.

## Component inputs (Full Checkout)

| Input | Purpose |
|-------|---------|
| \`product\` | Required \`PaymentProduct\` |
| \`methods\` | Allow-list and visual order |
| \`checkout\` | Optional \`successUrl\`, \`cancelUrl\`, customer/shipping hints |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | Clamped 320–1200 (default 640) |
| \`successBehavior\` | Success UI behavior |
${localeInputs}

## Product shape

\`\`\`typescript
interface PaymentProduct {
  id: string;
  name: string;
  amount: number; // major units
  currency: string;
  description?: string;
  quantity?: number;
  imageUrl?: string;
  metadata?: Record<string, string>;
}
\`\`\`

Treat browser \`amount\` as untrusted display input. Your backend must derive trusted pricing.
`,
    ),

    page(
      {
        id: 'payment-methods',
        slug: 'payment-methods',
        title: 'Payment methods',
        description: 'Supported methods and method ordering.',
        order: 50,
        ...sharedGroups.config,
      },
      `
# Payment methods

Published methods for Angular **${version}**:

| Method id | Provider | Notes |
|-----------|----------|-------|
| \`card\` | Stripe | Stripe Payment Element |
| \`paypal\` | PayPal | Official PayPal buttons |
| \`apple-pay\` | Apple Pay via Stripe | Express Checkout Element / domain setup |
| \`google-pay\` | Google Pay via Stripe | \`TEST\` or \`PRODUCTION\` environment |
| \`klarna\` | Klarna via Stripe | BNPL; country/currency eligibility |
| \`affirm\` | Affirm via Stripe | Installments; eligibility limits |

## Not supported

**Samsung Pay** is not implemented.

## Method allow-list and order

Pass \`methods\` to control which options appear and in what order:

\`\`\`typescript
methods: PaymentMethod[] = ['card', 'paypal', 'klarna'];
\`\`\`

Availability still depends on provider configuration, browser/device support, merchant onboarding, and TEST vs live environments.
`,
    ),

    page(
      {
        id: 'theming',
        slug: 'theming',
        title: 'Theming',
        description: 'Theme, appearance, and visual style.',
        order: 60,
        ...sharedGroups.config,
      },
      `
# Theming

## Theme

\`\`\`html
<easy-payments theme="light" [product]="product" [methods]="methods" />
<easy-payments theme="dark" [product]="product" [methods]="methods" />
<easy-payments theme="system" [product]="product" [methods]="methods" />
\`\`\`

- \`light\` / \`dark\` force Easy Payments colors
- \`system\` follows \`prefers-color-scheme\` and updates live

## Appearance

\`\`\`html
<easy-payments appearance="default" ... />
<easy-payments appearance="transparent" ... />
\`\`\`

| Value | Effect |
|-------|--------|
| \`default\` | Built-in outer shell |
| \`transparent\` | Removes outer chrome for embedding in your layout |

\`theme\` and \`appearance\` are independent.

## Visual style

Optional \`[visualStyle]\` overrides Easy Payments–owned tokens (font, text, surfaces, accent, radius, spacing). It does not restyle Stripe/PayPal/wallet chrome owned by providers.

## Max width

\`[maxWidth]\` is clamped between **320** and **1200** (default **640**).
`,
    ),

    page(
      {
        id: 'stripe',
        slug: 'stripe',
        title: 'Stripe Card',
        description: 'Card payments via Stripe Payment Element.',
        order: 70,
        ...sharedGroups.integrations,
      },
      `
# Stripe Card

Card checkout uses Stripe Payment Element through Easy Payments.

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_your_publishable_key' },
  },
  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
  },
});
\`\`\`

## Frontend rules

- Only the **publishable** key belongs in Angular
- Card number, CVC, and expiry stay inside Stripe-hosted fields
- Secret keys and webhook secrets stay on the server

## Backend

Your create-payment endpoint should create a PaymentIntent (or equivalent) with **server-trusted** amount/currency, then return the client secret your adapter expects.

Do not fulfill from the browser \`success\` event alone — confirm PaymentIntent status server-side or via signed webhooks.
`,
    ),

    page(
      {
        id: 'paypal',
        slug: 'paypal',
        title: 'PayPal',
        description: 'PayPal buttons with server create/capture.',
        order: 80,
        ...sharedGroups.integrations,
      },
      `
# PayPal

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    paypal: {
      clientId: 'your-paypal-client-id',
      currency: 'USD',
      intent: 'capture',
    },
  },
  backend: {
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
  },
});
\`\`\`

## Credentials

| In Angular | On server only |
|------------|----------------|
| PayPal Client ID | PayPal Client Secret |
| | Webhook verification credentials |

## Pricing

Treat client \`product.amount\` as untrusted. Create/capture routes should price from your catalog.
`,
    ),

    page(
      {
        id: 'apple-pay',
        slug: 'apple-pay',
        title: 'Apple Pay',
        description: 'Apple Pay via Stripe Express Checkout.',
        order: 90,
        ...sharedGroups.integrations,
      },
      `
# Apple Pay

Apple Pay is offered through Stripe-backed wallet flows.

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    applePay: {
      merchantName: 'Your Store',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Requirements

- Apple Pay capable device/browser
- Stripe Apple Pay domain verification for live use
- Merchant display name for the sheet

\`merchantId\` on the Apple Pay config is deprecated/ignored in the current public config model — follow Stripe domain registration guidance instead.

Live Apple Pay on a verified domain may require additional merchant setup beyond local mock-mode testing.
`,
    ),

    page(
      {
        id: 'google-pay',
        slug: 'google-pay',
        title: 'Google Pay',
        description: 'Google Pay button with Stripe confirmation.',
        order: 100,
        ...sharedGroups.integrations,
      },
      `
# Google Pay

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    googlePay: {
      merchantName: 'Your Store',
      environment: 'TEST',
      countryCode: 'US',
    },
  },
});
\`\`\`

## Environments

| Value | Use |
|-------|-----|
| \`TEST\` | Development / sandbox style testing |
| \`PRODUCTION\` | Live merchant configuration |

Google Pay \`PRODUCTION\` and live charges require complete merchant onboarding. Local demos often use mock mode or TEST.
`,
    ),

    page(
      {
        id: 'klarna',
        slug: 'klarna',
        title: 'Klarna',
        description: 'Klarna BNPL via Stripe-backed flows.',
        order: 110,
        ...sharedGroups.integrations,
      },
      `
# Klarna

Klarna is integrated as Stripe-backed BNPL.

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    klarna: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
  },
});
\`\`\`

## Eligibility

Availability depends on merchant country, currency, product amount, and Klarna/Stripe configuration. Not every shopper or catalog item is eligible.

Redirect return handling must keep \`checkout.successUrl\` on your origin when used.
`,
    ),

    page(
      {
        id: 'affirm',
        slug: 'affirm',
        title: 'Affirm',
        description: 'Affirm installments via Stripe-backed flows.',
        order: 120,
        ...sharedGroups.integrations,
      },
      `
# Affirm

Affirm is integrated as Stripe-backed installments.

## Configure

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    affirm: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
  },
});
\`\`\`

## Notes

- Affirm eligibility (including minimum amounts and supported currencies such as USD/CAD in provider docs) is enforced by Affirm/Stripe — not invented by this website
- Treat browser success as UX only; verify on the server
`,
    ),

    page(
      {
        id: 'mock-mode',
        slug: 'mock-mode',
        title: 'Mock mode',
        description: 'Local demos without real charges.',
        order: 130,
        ...sharedGroups.guides,
      },
      `
# Mock mode

Enable mock adapters for local UI demos:

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_demo' },
  },
  enableMockMode: true,
});
\`\`\`

## Behavior

- All configured methods use mock adapters
- **No real money** is processed
- Useful for screenshots, layout QA, and event wiring

## Production

Never enable \`enableMockMode\` in production builds.
`,
    ),

    page(
      {
        id: 'testing',
        slug: 'testing',
        title: 'Testing',
        description: 'Test keys, sandbox, and verification limits.',
        order: 140,
        ...sharedGroups.guides,
      },
      `
# Testing

## Recommended layers

1. **Mock mode** for UI and event wiring
2. Provider **TEST / Sandbox** credentials for integration rehearsals
3. Backend contract tests against your create/capture endpoints
4. Webhook signature verification tests on the server

## What local verification does not prove

- Live production charges
- Apple Pay on a verified live domain
- Google Pay \`PRODUCTION\` end-to-end
- Real provider → your server webhook delivery across environments

Document environment differences explicitly in your runbooks.
`,
    ),

    page(
      {
        id: 'error-handling',
        slug: 'error-handling',
        title: 'Error handling',
        description: 'PaymentError codes and UX events.',
        order: 150,
        ...sharedGroups.guides,
      },
      `
# Error handling

Listen for \`error\` on \`<easy-payments>\` and prefer stable \`PaymentError.code\` values when logging.

## Common codes

| Code | Meaning |
|------|---------|
| \`CONFIG_MISSING\` | Required configuration absent |
| \`CONFIG_INVALID\` | Configuration rejected |
| \`PRODUCT_INVALID\` | Product payload invalid |
| \`PROVIDER_UNAVAILABLE\` | Method unavailable in this environment |
| \`PROVIDER_NOT_CONFIGURED\` | Provider not configured |
| \`PAYMENT_CANCELLED\` | Shopper cancelled |
| \`PAYMENT_FAILED\` | Payment failed |
| \`CARD_DECLINED\` | Card declined |
| \`AUTHENTICATION_REQUIRED\` / \`AUTHENTICATION_FAILED\` | Auth challenges |
| \`NETWORK_ERROR\` | Network failure |
| \`SDK_LOAD_FAILED\` | Provider SDK failed to load |
| \`BACKEND_ERROR\` | Backend request failed |
| \`UNKNOWN\` | Unclassified |

Prefer \`code\` over free-form \`message\` for metrics and alerts.

Config failures should surface as \`error\`, not shopper \`cancel\`.
`,
    ),

    page(
      {
        id: 'security',
        slug: 'security',
        title: 'Security',
        description: 'Secrets, verification, and fulfillment rules.',
        order: 160,
        ...sharedGroups.guides,
      },
      `
# Security

Easy Payments is an **integration library**, not a payment processor.

## Frontend-safe

- Stripe publishable keys (\`pk_test_\` / \`pk_live_\`)
- PayPal Client ID
- Public merchant display names
- HTTPS URLs for **your** backend

Card data stays in Stripe Elements. Easy Payments does **not** claim automatic PCI compliance — follow Stripe and your own obligations.

## Never put in Angular

- Stripe secret keys (\`sk_\`)
- Stripe webhook secrets (\`whsec_\`)
- PayPal Client Secret / webhook verification secrets
- Private keys, access tokens, passwords

## Pricing

Browser \`product.amount\` is untrusted. Backend must validate product identity, amount, currency, and quantity before creating or capturing a charge.

## Fulfillment

Angular events (\`started\`, \`success\`, \`cancel\`, \`error\`) are **UX signals only**.

Fulfill from:

1. Verified provider webhooks, or
2. Server-side retrieval of PaymentIntent / capture status

## Mock mode

\`enableMockMode: true\` never processes real money. Disable in production.

## Metadata

Optional \`PaymentProduct.metadata\` must not carry secrets or PII. Treat it as untrusted browser input; validate again on the server.
`,
    ),

    page(
      {
        id: 'troubleshooting',
        slug: 'troubleshooting',
        title: 'Troubleshooting',
        description: 'Common setup failures and checks.',
        order: 170,
        ...sharedGroups.guides,
      },
      `
# Troubleshooting

## Checkout does not render a method

- Confirm the method id is listed in \`[methods]\`
- Confirm the matching provider block exists in \`provideEasyPayments\`
- Check device/browser support for wallets
- Try mock mode to separate UI issues from provider onboarding

## Payments fail immediately

- Inspect \`PaymentError.code\`
- Verify backend URLs are HTTPS and reachable
- Confirm TEST vs live keys match the environment
- Ensure secret keys are not missing on the server

## Success in browser but no order

Expected if you fulfill only from client events. Wire webhook verification or server-side status checks.

## Theme looks wrong

- Use \`light\` / \`dark\` / \`system\` (not \`white\`)
- Remember provider-owned chrome is not fully controlled by Easy Payments tokens
`,
    ),

    page(
      {
        id: 'api-reference',
        slug: 'api-reference',
        title: 'API reference',
        description: 'Public Full Checkout API for this version.',
        order: 180,
        ...sharedGroups.reference,
      },
      `
# API reference

Public surface documented for Angular **${version}** Full Checkout.

## Provider

- \`provideEasyPayments(config: EasyPaymentsConfig)\`

## Component

- \`EasyPaymentsComponent\` selector \`<easy-payments>\`

### Inputs

| Name | Type / notes |
|------|----------------|
| \`product\` | Required \`PaymentProduct\` |
| \`methods\` | \`PaymentMethod[]\` allow-list/order |
| \`checkout\` | Optional checkout options |
| \`checkoutInstanceId\` | Optional instance id |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number, clamped 320–1200 |
| \`successBehavior\` | success UI behavior |
${localeApiRows}

### Outputs

| Name | Purpose |
|------|---------|
| \`success\` | Payment succeeded (UX) |
| \`cancel\` | Payment cancelled |
| \`error\` | Payment error |
| \`successContinue\` | Shopper continued from success UI |

> Additional lifecycle outputs may exist in later trees. This page focuses on the stable Full Checkout contract described for published ${version}.

## Core types

- \`PaymentMethod\`: \`card\` \\| \`paypal\` \\| \`apple-pay\` \\| \`google-pay\` \\| \`klarna\` \\| \`affirm\`
- \`PaymentProduct\`, \`PaymentResult\`, \`PaymentError\`, \`CheckoutOptions\`

## Out of scope for ${version} docs

- \`EasyPaymentsHeadless\` (1.2.0 RC)
- Buttons Only merchant triggers / \`bnplConfirmMode\` (1.2.0 RC)
`,
    ),

    page(
      {
        id: 'examples',
        slug: 'examples',
        title: 'Examples',
        description: 'Copyable setup and checkout examples.',
        order: 190,
        ...sharedGroups.reference,
      },
      `
# Examples

## Install

\`\`\`bash
npm install @easy-payments/angular@${version} @stripe/stripe-js
\`\`\`

## Provider registration

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_replace_me' },
        paypal: { clientId: 'replace_me' },
      },
      backend: {
        createPaymentUrl: 'https://api.example.com/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/paypal/capture',
      },
    }),
  ],
};
\`\`\`

## Basic checkout

\`\`\`html
<easy-payments
  [product]="product"
  [methods]="['card', 'paypal']"
  theme="system"
  appearance="default"
  [maxWidth]="640"
  (success)="onSuccess($event)"
  (error)="onError($event)"
/>
\`\`\`

## Theme configuration

\`\`\`html
<easy-payments
  theme="dark"
  appearance="transparent"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

## Mock mode

\`\`\`typescript
provideEasyPayments({
  providers: { stripe: { publishableKey: 'pk_test_demo' } },
  enableMockMode: true,
});
\`\`\`

Replace publishable keys and Client IDs with your own TEST credentials. Keep secrets on the server.
`,
    ),
  ];

  return [...pages, ...extras];
}

const localization = page(
  {
    id: 'localization',
    slug: 'localization',
    title: 'Localization',
    description: 'UI locales added in Angular 1.1.0.',
    order: 65,
    ...sharedGroups.config,
  },
  `
# Localization

Added in **Angular 1.1.0**.

## Locale input

\`\`\`html
<easy-payments
  locale="auto"
  [product]="product"
  [methods]="methods"
/>
\`\`\`

Allowed values: \`auto\` | \`en\` | \`es\` | \`pt\` (default \`auto\`).

Browser auto-detect maps:

- \`es-*\` → Spanish
- \`pt-*\` → Portuguese
- \`en-*\` → English
- other languages → English fallback

## Translations

Optional \`[translations]\` supplies partial string overrides. Resolution order: override → locale dictionary → English.

## Amount display

Amounts use \`Intl\` formatting for the active locale **without converting currency**. \`product.amount\` and \`product.currency\` stay unchanged.

## Provider surfaces

Provider-owned sheets (wallets, bank UIs) may follow their own locale rules and are not fully controlled by Easy Payments.
`,
);

const migration = page(
  {
    id: 'migration',
    slug: 'migration',
    title: 'Migration from 1.0',
    description: 'Upgrade notes from 1.0.x to 1.1.0.',
    order: 200,
    ...sharedGroups.reference,
  },
  `
# Migration from 1.0

## 1.0.x → 1.1.0

1.1.0 is a **localization** release.

### What changed

- New \`[locale]\` input
- New \`[translations]\` input
- Built-in English / Spanish / Portuguese UI dictionaries
- Intl amount display formatting (no FX conversion)

### What stayed the same

- Package name \`@easy-payments/angular\`
- Angular peer range \`>=20.3.0 <23.0.0\`
- Full Checkout methods and provider configuration model
- No currency conversion semantics

### Upgrade steps

1. Install \`@easy-payments/angular@1.1.0\`
2. Optionally set \`locale\` / \`translations\` on \`<easy-payments>\`
3. Regression-test checkout copy in your target locales

### Not in 1.1.0

Buttons Only Direct / Headless features belong to **1.2.0** (unpublished RC) and are omitted here.
`,
);

writeVersion('1.0.0', basePages('1.0.0'));
writeVersion('1.1.0', basePages('1.1.0', [localization, migration]));
