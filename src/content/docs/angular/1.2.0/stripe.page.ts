import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "stripe",
  "slug": "stripe",
  "title": "Stripe Card",
  "description": "Card payments via Stripe Payment Element.",
  "order": 70,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# Stripe Card\n\nCard checkout uses Stripe Payment Element through Easy Payments.\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_your_publishable_key' },\n  },\n  backend: {\n    createPaymentUrl: 'https://api.example.com/api/payments/create',\n  },\n});\n```\n\n## Frontend rules\n\n- Only the **publishable** key belongs in Angular\n- Card number, CVC, and expiry stay inside Stripe-hosted fields\n- Secret keys and webhook secrets stay on the server\n\n## Backend\n\nYour create-payment endpoint should create a PaymentIntent (or equivalent) with **server-trusted** amount/currency, then return the client secret your adapter expects.\n\nDo not fulfill from the browser `success` event alone — confirm PaymentIntent status server-side or via signed webhooks.\n"
};
