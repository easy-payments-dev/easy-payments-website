import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'quick-start',
  slug: 'quick-start',
  title: 'Quick start',
  description:
    'Install published 1.1.0, enable mock mode, and render a first Full Checkout.',
  order: 30,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Quick start

**Target package:** published \`@easy-payments/angular@1.1.0\` (npm).
This guide uses **Full Checkout** (\`<easy-payments>\`) with \`enableMockMode\` so you can finish a first demo without real charges.

> Buttons Only and Headless are **not** in npm 1.1.0. They ship in unpublished local **1.2.0** and are previewed on the [Playground](/playground). See [Checkout modes](./checkout-modes).

## 1. Install

\`\`\`bash
npm install @easy-payments/angular@1.1.0 @stripe/stripe-js
\`\`\`

Peers: Angular \`>=20.3.0 <23.0.0\`, \`@stripe/stripe-js\` \`^8.0.0\`. Verified consumer smoke tests cover Angular **20**, **21**, and **22**.

## 2. Register providers (mock)

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      // Mock adapters — no real charges. Never enable in production.
      enableMockMode: true,
      providers: {},
    }),
  ],
};
\`\`\`

For a real Stripe TEST integration later, add \`providers.stripe.publishableKey\` (\`pk_test_...\`) and your HTTPS \`backend\` URLs. Keep **secret** keys on the server only — see [Security](./security).

## 3. Mount Full Checkout

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
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
      locale="auto"
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
    description: 'Mock checkout example',
    amount: 99, // major units ($99.00)
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list and display order — controlled by you. */
  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];

  onSuccess(result: PaymentResult): void {
    // UX only — fulfill after backend / webhook verification
  }

  onCancel(result: PaymentResult): void {}

  onError(error: PaymentError): void {}
}
\`\`\`

## 4. What you control vs what the library provides

| You configure | Library provides (Full Checkout) |
|---------------|----------------------------------|
| Product name, amount (major units), currency, quantity | Checkout shell, method list UI, provider marks |
| Method allow-list and order | Normalized \`success\` / \`cancel\` / \`error\` events |
| \`theme\` (\`light\` \\| \`dark\` \\| \`system\`) and \`locale\` | Built-in en / es / pt checkout copy (1.1.0) |

## Mock outcomes

Inject \`MockPaymentController\` to force \`success\`, \`cancelled\`, or \`failed\` before paying. Details: [Mock mode](./mock-mode).

Klarna in mock mode is a **DEMO** flow from the library adapters — not an official Klarna hosted checkout. Try it on the [Playground](/playground).

## Next

- [Configuration](./configuration) — real providers and backend URLs
- [Checkout modes](./checkout-modes) — Full vs Buttons Only vs Headless
- [Payment methods](./payment-methods) — real / sandbox / mock status
- [API reference](./api-reference) · [Examples](./examples)
`,
};
