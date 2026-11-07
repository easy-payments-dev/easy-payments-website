import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "examples",
  "slug": "examples",
  "title": "Examples",
  "description": "Copyable setup and checkout examples.",
  "order": 190,
  "groupId": "reference",
  "groupTitle": "Reference",
  "markdown": "# Examples\n\n## Install\n\n```bash\nnpm install @easy-payments/angular@1.1.0 @stripe/stripe-js\n```\n\n## Provider registration\n\n```typescript\nimport { ApplicationConfig } from '@angular/core';\nimport { provideHttpClient } from '@angular/common/http';\nimport { provideEasyPayments } from '@easy-payments/angular';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [\n    provideHttpClient(),\n    provideEasyPayments({\n      providers: {\n        stripe: { publishableKey: 'pk_test_replace_me' },\n        paypal: { clientId: 'replace_me' },\n      },\n      backend: {\n        createPaymentUrl: 'https://api.example.com/api/payments/create',\n        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',\n        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',\n      },\n    }),\n  ],\n};\n```\n\n## Basic checkout\n\n```html\n<easy-payments\n  [product]=\"product\"\n  [methods]=\"['card', 'paypal']\"\n  theme=\"system\"\n  appearance=\"default\"\n  [maxWidth]=\"640\"\n  (success)=\"onSuccess($event)\"\n  (error)=\"onError($event)\"\n/>\n```\n\n## Theme configuration\n\n```html\n<easy-payments\n  theme=\"dark\"\n  appearance=\"transparent\"\n  [product]=\"product\"\n  [methods]=\"methods\"\n/>\n```\n\n## Mock mode\n\n```typescript\nprovideEasyPayments({\n  providers: { stripe: { publishableKey: 'pk_test_demo' } },\n  enableMockMode: true,\n});\n```\n\nReplace publishable keys and Client IDs with your own TEST credentials. Keep secrets on the server.\n"
};
