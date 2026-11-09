import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'klarna',
  slug: 'klarna',
  title: 'Klarna',
  description: 'Klarna BNPL via Stripe — real path and mock DEMO caveats.',
  order: 110,
  groupId: 'integrations',
  groupTitle: 'Integrations',
  markdown: `# Klarna

Klarna is integrated as **Stripe-backed BNPL** in published Angular **1.1.0** Full Checkout.

## Real / TEST configuration

\`\`\`typescript
provideEasyPayments({
  providers: {
    stripe: { publishableKey: 'pk_test_...' },
    klarna: {
      purchaseCountry: 'US',
    },
  },
  backend: {
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
  },
});
\`\`\`

### Frontend

- Include \`'klarna'\` in \`[methods]\`
- Publishable Stripe key only in the browser
- Optional \`checkout.successUrl\` / \`cancelUrl\` on your origin for redirect returns

### Backend

- Create/confirm PaymentIntent (or equivalent) with **secret** keys on the server
- Verify webhooks before fulfilling orders — browser \`success\` is UX only

## Eligibility

Availability depends on merchant country, currency, product amount, and Klarna/Stripe configuration. Not every shopper or catalog item is eligible.

## Mock DEMO (Playground / enableMockMode)

When \`enableMockMode: true\`, Klarna uses the library’s **mock DEMO** adapter:

- **No** real Klarna hosted window
- **Not** an official Klarna sandbox checkout UI
- Outcomes come from \`MockPaymentController\` (\`success\` / \`cancelled\` / \`failed\`)

Try the labeled DEMO flow on the [Playground](/playground). Details: [Mock mode](./mock-mode).
`,
};