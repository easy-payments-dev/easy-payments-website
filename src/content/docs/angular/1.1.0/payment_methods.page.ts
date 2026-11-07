import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "payment-methods",
  "slug": "payment-methods",
  "title": "Payment methods",
  "description": "Supported methods and method ordering.",
  "order": 50,
  "groupId": "configuration",
  "groupTitle": "Configuration",
  "markdown": "# Payment methods\n\nPublished methods for Angular **1.1.0**:\n\n| Method id | Provider | Notes |\n|-----------|----------|-------|\n| `card` | Stripe | Stripe Payment Element |\n| `paypal` | PayPal | Official PayPal buttons |\n| `apple-pay` | Apple Pay via Stripe | Express Checkout Element / domain setup |\n| `google-pay` | Google Pay via Stripe | `TEST` or `PRODUCTION` environment |\n| `klarna` | Klarna via Stripe | BNPL; country/currency eligibility |\n| `affirm` | Affirm via Stripe | Installments; eligibility limits |\n\n## Not supported\n\n**Samsung Pay** is not implemented.\n\n## Method allow-list and order\n\nPass `methods` to control which options appear and in what order:\n\n```typescript\nmethods: PaymentMethod[] = ['card', 'paypal', 'klarna'];\n```\n\nAvailability still depends on provider configuration, browser/device support, merchant onboarding, and TEST vs live environments.\n"
};
