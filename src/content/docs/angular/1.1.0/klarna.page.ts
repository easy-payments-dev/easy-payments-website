import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "klarna",
  "slug": "klarna",
  "title": "Klarna",
  "description": "Klarna BNPL via Stripe-backed flows.",
  "order": 110,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# Klarna\n\nKlarna is integrated as Stripe-backed BNPL.\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_...' },\n    klarna: {\n      purchaseCountry: 'US',\n    },\n  },\n  backend: {\n    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',\n  },\n});\n```\n\n## Eligibility\n\nAvailability depends on merchant country, currency, product amount, and Klarna/Stripe configuration. Not every shopper or catalog item is eligible.\n\nRedirect return handling must keep `checkout.successUrl` on your origin when used.\n"
};
