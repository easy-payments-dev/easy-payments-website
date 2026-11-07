import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "affirm",
  "slug": "affirm",
  "title": "Affirm",
  "description": "Affirm installments via Stripe-backed flows.",
  "order": 120,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# Affirm\n\nAffirm is integrated as Stripe-backed installments.\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_...' },\n    affirm: {\n      purchaseCountry: 'US',\n    },\n  },\n  backend: {\n    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',\n  },\n});\n```\n\n## Notes\n\n- Affirm eligibility (including minimum amounts and supported currencies such as USD/CAD in provider docs) is enforced by Affirm/Stripe — not invented by this website\n- Treat browser success as UX only; verify on the server\n"
};
