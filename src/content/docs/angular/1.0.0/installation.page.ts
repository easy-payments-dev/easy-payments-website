import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "installation",
  "slug": "installation",
  "title": "Installation",
  "description": "Install the published Angular package and peers.",
  "order": 20,
  "groupId": "getting-started",
  "groupTitle": "Getting started",
  "markdown": "# Installation\n\nInstall the published package and Stripe.js peer:\n\n```bash\nnpm install @easy-payments/angular@1.0.0 @stripe/stripe-js\n```\n\n## Peer dependencies\n\n| Package | Range |\n|---------|-------|\n| `@angular/core` | `>=20.3.0 <23.0.0` |\n| `@angular/common` | `>=20.3.0 <23.0.0` |\n| `@stripe/stripe-js` | `^8.0.0` |\n\n## App providers\n\nEasy Payments is **standalone-only** (no NgModule). Register HTTP and Easy Payments in your application config:\n\n```typescript\nimport { ApplicationConfig } from '@angular/core';\nimport { provideHttpClient } from '@angular/common/http';\nimport { provideEasyPayments } from '@easy-payments/angular';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [\n    provideHttpClient(),\n    provideEasyPayments({\n      providers: {\n        stripe: { publishableKey: 'pk_test_your_key' },\n        // Add PayPal / wallets / BNPL only when configured\n      },\n      // enableMockMode: true // local demos only — never in production\n    }),\n  ],\n};\n```\n\n## Credentials\n\n| Allowed in Angular | Never in Angular |\n|--------------------|------------------|\n| Stripe **publishable** key (`pk_test_` / `pk_live_`) | Stripe **secret** key (`sk_`) |\n| PayPal **Client ID** | PayPal **Client Secret** |\n| Public merchant display names | Webhook secrets (`whsec_`) |\n| Your HTTPS backend URLs | Access tokens / private keys |\n\nSee [Security](./security).\n"
};
