import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "google-pay",
  "slug": "google-pay",
  "title": "Google Pay",
  "description": "Google Pay button with Stripe confirmation.",
  "order": 100,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# Google Pay\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_...' },\n    googlePay: {\n      merchantName: 'Your Store',\n      environment: 'TEST',\n      countryCode: 'US',\n    },\n  },\n});\n```\n\n## Environments\n\n| Value | Use |\n|-------|-----|\n| `TEST` | Development / sandbox style testing |\n| `PRODUCTION` | Live merchant configuration |\n\nGoogle Pay `PRODUCTION` and live charges require complete merchant onboarding. Local demos often use mock mode or TEST.\n"
};
