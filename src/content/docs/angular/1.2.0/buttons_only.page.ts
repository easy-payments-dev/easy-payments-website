import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'buttons-only',
  slug: 'buttons-only',
  title: 'Buttons Only',
  description:
    'Embed the library payment strip inside your own cart or checkout chrome.',
  order: 37,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Buttons Only

**When to choose it:** you already own cart totals, shipping, and layout — you only need Easy Payments’ compact payment strip (\`<easy-payment-buttons>\`) with official wallet buttons and shared expand panels for card / BNPL.

**Runnable mock demo:** [Playground → Buttons Only](/playground?demo=buttons)

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

## Complete Buttons Only example

Your app keeps the order summary. Easy Payments owns the payment strip. You still define product, price, currency, methods, and order.

\`\`\`typescript
import { Component } from '@angular/core';
import {
  EasyPaymentButtonsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
  PaymentStartedEvent,
} from '@easy-payments/angular';

@Component({
  selector: 'app-cart-payments',
  standalone: true,
  imports: [EasyPaymentButtonsComponent],
  template: \`
    <aside class="cart">
      <h2>{{ product.name }}</h2>
      <p>{{ product.amount }} {{ product.currency }}</p>
      <p>Shipping: Free · Taxes calculated at capture</p>
    </aside>

    <section aria-label="Pay with">
      <easy-payment-buttons
        [product]="product"
        [methods]="methods"
        layout="vertical"
        theme="system"
        locale="auto"
        checkoutInstanceId="store-cart-payments"
        (started)="onStarted($event)"
        (success)="onSuccess($event)"
        (cancel)="onCancel($event)"
        (error)="onError($event)"
      />
    </section>
  \`,
})
export class CartPaymentsComponent {
  readonly product: PaymentProduct = {
    id: 'hoodie-navy',
    name: 'Navy hoodie',
    description: 'Buttons Only strip inside a custom cart',
    amount: 68,
    currency: 'USD',
    quantity: 1,
  };

  /** Compact strip: wallets first, then card — order is yours. */
  readonly methods: PaymentMethod[] = [
    'apple-pay',
    'google-pay',
    'paypal',
    'card',
    'klarna',
  ];

  onStarted(event: PaymentStartedEvent): void {
    console.log('started', event.method);
  }

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
}
\`\`\`

## Configuration highlights

| You set | Library provides |
|---------|------------------|
| \`product\`, \`methods\` order | Compact strip + official wallet buttons |
| \`layout\` (\`vertical\` \\| \`horizontal\`) | Shared expand panel for card / BNPL |
| \`theme\`, \`locale\`, optional \`checkoutInstanceId\` | Normalized \`started\` / \`success\` / \`cancel\` / \`error\` |

## Notes

- Klarna in mock mode remains a **DEMO** adapter — not official Klarna UI.
- Prefer Full Checkout when you do not already have cart chrome: [Full Checkout](./full-checkout).
- Need total visual control? [Headless](./headless). Overview: [Checkout modes](./checkout-modes).
`,
};