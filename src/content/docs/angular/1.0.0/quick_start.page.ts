import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'quick-start',
  slug: 'quick-start',
  title: 'Quick start',
  description:
    'Install published 1.0.0, enable mock mode, and render a first Full Checkout.',
  order: 30,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Quick start

**Target package:** published \`@easy-payments/angular@1.0.0\` (npm).
This guide uses **Full Checkout** (\`<easy-payments>\`) with \`enableMockMode\`.

> Prefer **1.1.0** for localization (\`locale\` / \`translations\`). Buttons Only and Headless are unpublished **1.2.0** — see [Checkout modes](./checkout-modes) and the [Playground](/playground).

## 1. Install

\`\`\`bash
npm install @easy-payments/angular@1.0.0 @stripe/stripe-js
\`\`\`

## 2. Register providers (mock)

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true,
      providers: {},
    }),
  ],
};
\`\`\`

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

  onSuccess(result: PaymentResult): void {}
  onCancel(result: PaymentResult): void {}
  onError(error: PaymentError): void {}
}
\`\`\`

\`product.amount\` uses **major units**. Browser \`success\` is UX only — verify on your backend. Klarna mock flows are **DEMO** only.

Next: [Configuration](./configuration) · [Checkout modes](./checkout-modes) · [Payment methods](./payment-methods)
`,
};
