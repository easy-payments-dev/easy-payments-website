import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "apple-pay",
  "slug": "apple-pay",
  "title": "Apple Pay",
  "description": "Apple Pay via Stripe Express Checkout.",
  "order": 90,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# Apple Pay\n\nApple Pay is offered through Stripe-backed wallet flows.\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_...' },\n    applePay: {\n      merchantName: 'Your Store',\n      countryCode: 'US',\n    },\n  },\n});\n```\n\n## Requirements\n\n- Apple Pay capable device/browser\n- Stripe Apple Pay domain verification for live use\n- Merchant display name for the sheet\n\n`merchantId` on the Apple Pay config is deprecated/ignored in the current public config model — follow Stripe domain registration guidance instead.\n\nLive Apple Pay on a verified domain may require additional merchant setup beyond local mock-mode testing.\n"
};
