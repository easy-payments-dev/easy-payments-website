import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'payment-methods',
  slug: 'payment-methods',
  title: 'Payment methods',
  description: 'Method ids, ordering, and real vs sandbox vs mock status.',
  order: 50,
  groupId: 'configuration',
  groupTitle: 'Configuration',
  markdown: `# Payment methods

You control which methods appear and in which order via the \`methods\` input. Easy Payments does not rearrange your allow-list.

\`\`\`typescript
methods: PaymentMethod[] = ['card', 'paypal', 'klarna'];
\`\`\`

## Status matrix (evidence-based)

Statuses below describe what this documentation set can honestly claim for Angular **1.2.0** Full Checkout plus the website mock Playground. They are **not** a guarantee of merchant eligibility.

| Method id | Provider path | Integration status | Notes |
|-----------|---------------|--------------------|-------|
| \`card\` | Stripe Payment Element | **Real + sandbox/TEST** | Publishable key + your create-payment backend; use \`pk_test_\` in TEST |
| \`paypal\` | PayPal Buttons | **Real + sandbox** | Client ID in Angular; Client Secret only on your server |
| \`apple-pay\` | Apple Pay via Stripe | **Real + TEST** (device-dependent) | Requires HTTPS, eligible device/browser, and Stripe/Apple domain setup; may be hidden when unavailable |
| \`google-pay\` | Google Pay via Stripe | **Real + TEST** | \`environment: 'TEST' \\| 'PRODUCTION'\`; PRODUCTION needs full merchant onboarding |
| \`klarna\` | Klarna via Stripe BNPL | **Real path documented** + **mock DEMO** | Live eligibility depends on country/currency/amount; website/playground mock is labeled **DEMO** (not official Klarna UI) |
| \`affirm\` | Affirm via Stripe | **Real path documented** + mock | Eligibility limits apply; mock available with \`enableMockMode\` |

### Legend

- **Real + sandbox/TEST** — published APIs exist; you can integrate with provider TEST/sandbox credentials and your backend.
- **Mock DEMO** — local \`enableMockMode\` adapters for UI/event demos; **no charges**.
- **Pending** — not claimed here (example: Samsung Pay is **not** implemented).

## Not supported

**Samsung Pay** is not implemented.

## Availability gotchas

Wallets can be configured yet still **not render** when the browser, device, domain registration, or merchant onboarding is incomplete. See [Troubleshooting](./troubleshooting) and the [FAQ](/faq#wallets-missing).

Provider guides: [Stripe](./stripe) · [PayPal](./paypal) · [Apple Pay](./apple-pay) · [Google Pay](./google-pay) · [Klarna](./klarna) · [Affirm](./affirm).
`,
};