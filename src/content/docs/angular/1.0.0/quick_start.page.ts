import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "quick-start",
  "slug": "quick-start",
  "title": "Quick start",
  "description": "Minimal Full Checkout integration.",
  "order": 30,
  "groupId": "getting-started",
  "groupTitle": "Getting started",
  "markdown": "# Quick start\n\nRender Full Checkout with a product and method list.\n\n```typescript\nimport { Component } from '@angular/core';\nimport {\n  EasyPaymentsComponent,\n  PaymentMethod,\n  PaymentProduct,\n} from '@easy-payments/angular';\n\n@Component({\n  selector: 'app-checkout',\n  standalone: true,\n  imports: [EasyPaymentsComponent],\n  template: `\n    <easy-payments\n      [product]=\"product\"\n      [methods]=\"methods\"\n      theme=\"system\"\n      (success)=\"onSuccess($event)\"\n      (cancel)=\"onCancel($event)\"\n      (error)=\"onError($event)\"\n    />\n  `,\n})\nexport class CheckoutComponent {\n  readonly product: PaymentProduct = {\n    id: 'premium',\n    name: 'Premium Plan',\n    amount: 99,\n    currency: 'USD',\n  };\n\n  readonly methods: PaymentMethod[] = [\n    'card',\n    'paypal',\n    'apple-pay',\n    'google-pay',\n    'klarna',\n    'affirm',\n  ];\n\n  onSuccess(result: unknown): void {\n    // UX only — fulfill after backend / webhook verification\n  }\n\n  onCancel(result: unknown): void {}\n  onError(error: unknown): void {}\n}\n```\n\n## Amounts\n\n`product.amount` uses **major units** (for example `99` means $99.00), not the smallest currency subunit.\n\n## Success events\n\nBrowser `success` is a **UX signal**. Do not fulfill orders from client events alone. Verify PaymentIntent / capture status on your server or via provider webhooks.\n"
};
