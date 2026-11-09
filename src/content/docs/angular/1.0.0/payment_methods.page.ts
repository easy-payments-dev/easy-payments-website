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

You control which methods appear and in which order via \`methods\`.

| Method id | Provider path | Integration status | Notes |
|-----------|---------------|--------------------|-------|
| \`card\` | Stripe | **Real + sandbox/TEST** | \`pk_test_\` / live keys + your backend |
| \`paypal\` | PayPal | **Real + sandbox** | Client ID in browser; secret on server |
| \`apple-pay\` | Apple Pay via Stripe | **Real + TEST** (device-dependent) | May stay hidden without eligible device/domain |
| \`google-pay\` | Google Pay via Stripe | **Real + TEST** | \`TEST\` / \`PRODUCTION\` environments |
| \`klarna\` | Klarna via Stripe | **Real path** + **mock DEMO** | Mock DEMO is not official Klarna UI |
| \`affirm\` | Affirm via Stripe | **Real path** + mock | Eligibility limits apply |

**Samsung Pay** is not implemented. See [FAQ](/faq#methods-status) and provider guides under Integrations.
`,
};
