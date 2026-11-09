import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'migration',
  slug: 'migration',
  title: 'Migration',
  description: 'Upgrade notes from 1.0.x / 1.1.0 to 1.2.0.',
  order: 200,
  groupId: 'reference',
  groupTitle: 'Reference',
  markdown: `# Migration

## 1.1.0 → 1.2.0

1.2.0 adds **Buttons Only** and **Headless** alongside Full Checkout.

### What changed

- New \`<easy-payment-buttons>\` component
- New \`EasyPaymentsHeadless\` session API
- Full Checkout localization from 1.1.0 remains available

### Upgrade steps

1. Install \`@easy-payments/angular@1.2.0\`
2. Keep existing \`<easy-payments>\` usage, or adopt Buttons Only / Headless
3. Regression-test mock and sandbox flows for the methods you enable

Mode guides: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless)

## 1.0.x → 1.2.0

If you are still on 1.0.x, treat this as a combined localization + modes upgrade:

1. Install \`@easy-payments/angular@1.2.0\`
2. Optionally set \`locale\` / \`translations\` on Full Checkout or Buttons Only
3. Regression-test checkout copy in en / es / pt
4. Optionally adopt Buttons Only or Headless

Package name and Angular peer range (\`>=20.3.0 <23.0.0\`) stay the same. No currency conversion semantics were added.
`,
};