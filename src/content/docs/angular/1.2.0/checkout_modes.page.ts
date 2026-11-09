import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'checkout-modes',
  slug: 'checkout-modes',
  title: 'Checkout modes',
  description:
    'Compare Full Checkout, Buttons Only, and Headless in Easy Payments 1.2.0.',
  order: 35,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Checkout modes

Easy Payments **1.2.0** ships three integration shapes. Pick the one that matches how much UI you want the library to own. Every card answers the same three questions in the same order.

::: mode-cards
::: mode-card
## Full Checkout

- **When to use:** you want the fastest path to a complete checkout: order summary, payment methods, and confirmation in one component.
- **Who owns the UI:** the library.
- **Public API:** \`<easy-payments>\` (\`EasyPaymentsComponent\`).

[Try demo](/playground?demo=full) · [View guide](./full-checkout)
:::
::: mode-card
## Buttons Only

- **When to use:** you already have cart or checkout chrome and only need a compact payment-method strip inside it.
- **Who owns the UI:** shared. The library renders the strip and its expand panel; you own everything around it.
- **Public API:** \`<easy-payment-buttons>\` (\`EasyPaymentButtonsComponent\`) with \`[buttonsAppearance]\` for strip styling.

[Try demo](/playground?demo=buttons) · [View guide](./buttons-only)
:::
::: mode-card
## Headless

- **When to use:** you need a fully custom layout and only want the payment session and provider surfaces.
- **Who owns the UI:** you. The library mounts provider UI into your containers and never ships a checkout design.
- **Public API:** \`EasyPaymentsHeadless\` (\`createSession()\`, \`mount()\`, \`confirm()\`).

[Try demo](/playground?demo=headless) · [View guide](./headless)
:::
:::

## Choosing quickly

1. Need a complete checkout page tomorrow → **Full Checkout**.
2. Already have cart chrome and need a payment strip → **Buttons Only**.
3. Need a fully custom design → **Headless**.

All three modes on this website run with \`enableMockMode\`, so no money moves. Klarna mock flows are labeled **DEMO**. See [Mock mode](./mock-mode) and the [FAQ](/faq#which-mode).

## Install once

\`\`\`bash
npm install @easy-payments/angular@1.2.0 @stripe/stripe-js
\`\`\`

Then follow the guide for the mode that matches your product UI.
`,
};
