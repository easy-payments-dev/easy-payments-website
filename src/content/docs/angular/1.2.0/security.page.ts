import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "security",
  "slug": "security",
  "title": "Security",
  "description": "Secrets, verification, and fulfillment rules.",
  "order": 160,
  "groupId": "guides",
  "groupTitle": "Guides",
  "markdown": "# Security\n\nEasy Payments is an **integration library**, not a payment processor.\n\n## Frontend-safe\n\n- Stripe publishable keys (`pk_test_` / `pk_live_`)\n- PayPal Client ID\n- Public merchant display names\n- HTTPS URLs for **your** backend\n\nCard data stays in Stripe Elements. Easy Payments does **not** claim automatic PCI compliance — follow Stripe and your own obligations.\n\n## Never put in Angular\n\n- Stripe secret keys (`sk_`)\n- Stripe webhook secrets (`whsec_`)\n- PayPal Client Secret / webhook verification secrets\n- Private keys, access tokens, passwords\n\n## Pricing\n\nBrowser `product.amount` is untrusted. Backend must validate product identity, amount, currency, and quantity before creating or capturing a charge.\n\n## Fulfillment\n\nAngular events (`success`, `cancel`, `error`, `successContinue`) are **UX signals only**.\n\nFulfill from:\n\n1. Verified provider webhooks, or\n2. Server-side retrieval of PaymentIntent / capture status\n\n## Mock mode\n\n`enableMockMode: true` never processes real money. Disable in production.\n\n## Metadata\n\nOptional `PaymentProduct.metadata` must not carry secrets or PII. Treat it as untrusted browser input; validate again on the server.\n"
};
