import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'checkout-modes',
  slug: 'checkout-modes',
  title: 'Checkout modes',
  description:
    'Compare Full Checkout, Buttons Only, and Headless — what ships on npm vs local 1.2.0.',
  order: 35,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Checkout modes

Easy Payments offers three integration shapes. **Published npm 1.1.0** includes Full Checkout only. **Buttons Only** and **Headless** are available in unpublished local **1.2.0** (this website’s Playground) and are not installable from npm until 1.2.0 is published.

| Mode | Package surface | UI owner | When to use | Demo |
|------|-----------------|----------|-------------|------|
| **Full Checkout** | npm **1.1.0** (\`<easy-payments>\`) | Library | Fastest path: order summary + methods + confirm chrome | [Playground → Full Checkout](/playground) |
| **Buttons Only** | Unpublished **1.2.0** (\`<easy-payment-buttons>\`) | Library strip + shared expand panel | Embed a compact payment strip without the full checkout shell | [Playground → Buttons Only](/playground) |
| **Headless** | Unpublished **1.2.0** (\`EasyPaymentsHeadless\`) | **You** | Custom layout; library mounts provider surfaces into your containers | [Playground → Headless](/playground) |

## Full Checkout (published)

- Selector: \`<easy-payments>\`
- Library UI: product summary, method selection, confirmation / success states
- You pass: \`product\`, \`methods\` (order), \`theme\`, \`appearance\`, \`maxWidth\`, \`successBehavior\`, \`locale\` / \`translations\` (1.1.0)
- Start here: [Quick start](./quick-start)

## Buttons Only (Unpublished — 1.2.0)

- Selector: \`<easy-payment-buttons>\`
- Library UI: compact method strip (official wallet buttons where applicable), shared expansion for card / BNPL
- You pass: \`product\`, \`methods\`, \`layout\` (\`vertical\` \\| \`horizontal\`), \`theme\`, \`locale\`, optional appearance tokens
- **Not** on npm \`@easy-payments/angular@1.1.0\`

## Headless (Unpublished — 1.2.0)

- API: \`EasyPaymentsHeadless.createSession(...)\` then \`mount\` / \`confirm\`
- **No** checkout design from the library — your app owns chrome, labels, and layout
- Use when you need full visual control while still using Easy Payments adapters
- The Playground Headless demo is explicitly a **consumer-built example UI**

## Choosing quickly

1. Need a complete checkout page tomorrow → **Full Checkout** (1.1.0).
2. Need a strip inside an existing cart UI → **Buttons Only** (wait for npm 1.2.0, or try Playground).
3. Need a fully custom design → **Headless** (same).

All three modes on this website run with \`enableMockMode\` — no money moves. See [Mock mode](./mock-mode) and the [FAQ](/faq).
`,
};
