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

Klarna is integrated as Stripe-backed BNPL in published Angular **1.0.0**.

## Configure

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

## Eligibility

Depends on merchant country, currency, amount, and Klarna/Stripe setup.

## Mock DEMO

With \`enableMockMode\`, Klarna uses a library **DEMO** adapter — not an official Klarna hosted checkout. Try it on the [Playground](/playground).
`,
};
