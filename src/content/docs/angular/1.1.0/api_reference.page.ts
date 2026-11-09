import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "api-reference",
  "slug": "api-reference",
  "title": "API reference",
  "description": "Public Full Checkout API for this version.",
  "order": 180,
  "groupId": "reference",
  "groupTitle": "Reference",
  "markdown": "# API reference\n\nPublic surface documented for Angular **1.1.0** Full Checkout. For choosing Full vs Buttons Only vs Headless, see [Checkout modes](./checkout-modes). Executable mocks: [Playground](/playground) · [Examples](./examples).\n\n## Provider\n\n- `provideEasyPayments(config: EasyPaymentsConfig)`\n\n## Component\n\n- `EasyPaymentsComponent` selector `<easy-payments>`\n\n### Inputs\n\n| Name | Type / notes |\n|------|----------------|\n| `product` | Required `PaymentProduct` |\n| `methods` | `PaymentMethod[]` allow-list/order |\n| `checkout` | Optional checkout options |\n| `theme` | `light` \\| `dark` \\| `system` |\n| `appearance` | `default` \\| `transparent` |\n| `maxWidth` | number \\| string, clamped 320–1200 (default 640) |\n| `successBehavior` | `confirmation` \\| `event-only` |\n| `locale` | `auto` \\| `en` \\| `es` \\| `pt` |\n| `translations` | `Partial<EasyPaymentsTranslations>` |\n\n### Outputs\n\n| Name | Purpose |\n|------|---------|\n| `success` | Payment succeeded (UX) |\n| `cancel` | Payment cancelled |\n| `error` | Payment error |\n| `successContinue` | Shopper continued from success UI |\n\n> Verified against the published npm declaration file for 1.1.0.\n\n## Core types\n\n- `PaymentMethod`: `card` \\| `paypal` \\| `apple-pay` \\| `google-pay` \\| `klarna` \\| `affirm`\n- `PaymentProduct`, `PaymentResult`, `PaymentError`, `CheckoutOptions`\n\n## Out of scope for 1.1.0 docs\n\n- `EasyPaymentsHeadless` (1.2.0 RC)\n- Buttons Only merchant triggers / `bnplConfirmMode` (1.2.0 RC)\n"
};
