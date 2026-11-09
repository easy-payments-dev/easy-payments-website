import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'checkout-modes',
  slug: 'checkout-modes',
  title: 'Checkout modes',
  description:
    'Compare Full Checkout, Buttons Only, and Headless — npm 1.0.0 vs later releases.',
  order: 35,
  groupId: 'getting-started',
  groupTitle: 'Getting started',
  markdown: `# Checkout modes

| Mode | Package surface | UI owner | Demo |
|------|-----------------|----------|------|
| **Full Checkout** | npm **1.0.0** / **1.1.0** (\`<easy-payments>\`) | Library | [Playground](/playground) |
| **Buttons Only** | Unpublished **1.2.0** | Library strip | [Playground](/playground) |
| **Headless** | Unpublished **1.2.0** | **You** | [Playground](/playground) |

Published **1.0.0** documents Full Checkout only. Upgrade guidance for localization: see Angular **1.1.0** docs. Buttons Only / Headless remain unpublished until npm **1.2.0**.

Headless does **not** ship a checkout design — your app owns the chrome. FAQ: [/faq](/faq).
`,
};
