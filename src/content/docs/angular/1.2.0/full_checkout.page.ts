import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'full-checkout',
  slug: 'full-checkout',
  title: 'Full Checkout',
  description:
    'Complete library-owned checkout UI with product summary, methods, and results.',
  order: 36,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Full Checkout

**When to choose it:** you want Easy Payments to own the checkout chrome — product summary, method list, confirmation, and success states — so you can ship a multi-provider checkout without designing payment UI.

**Runnable mock demo:** [Playground → Full Checkout](/playground?demo=full)

## Install and providers

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      enableMockMode: true, // local demos only — never in production
      providers: {},
    }),
  ],
};
\`\`\`

## Complete Full Checkout example

You define the product, price (major units), currency, payment methods, and their order. The library renders the full checkout UI and emits normalized results.

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
  selector: 'app-store-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <h1>Complete your purchase</h1>
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      appearance="default"
      [maxWidth]="640"
      successBehavior="confirmation"
      locale="auto"
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
      (successContinue)="onContinue()"
    />
  \`,
})
export class StoreCheckoutComponent {
  /** Product + price + currency are owned by your app. */
  readonly product: PaymentProduct = {
    id: 'annual-pro',
    name: 'Annual Pro',
    description: 'Full library checkout for a subscription SKU',
    amount: 149, // major units → $149.00
    currency: 'USD',
    quantity: 1,
  };

  /** Allow-list + display order — Klarna is DEMO in mock mode. */
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
    console.log('success', result.status, result.method);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result.method);
  }

  onError(error: PaymentError): void {
    console.error(error.code, error.message);
  }

  onContinue(): void {
    // Shopper dismissed the built-in success confirmation
  }
}
\`\`\`

## Results you handle

| Output | Meaning |
|--------|---------|
| \`success\` | Provider/mock reported success for UX — still verify on your backend |
| \`cancel\` | Shopper cancelled |
| \`error\` | Payment or SDK failure |
| \`successContinue\` | Shopper continued from the library success UI |

## Notes

- Klarna mock flows are labeled **DEMO** — not an official Klarna hosted checkout.
- Switch \`enableMockMode\` off and supply publishable keys + HTTPS backends for sandbox/TEST or verified live support. See [Payment methods](./payment-methods).
- Compare modes: [Checkout modes](./checkout-modes) · [Buttons Only](./buttons-only) · [Headless](./headless)
`,
};