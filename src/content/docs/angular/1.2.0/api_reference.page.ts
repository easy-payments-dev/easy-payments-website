import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  id: 'api-reference',
  slug: 'api-reference',
  title: 'API reference',
  description: 'Public Full Checkout, Buttons Only, and Headless API for 1.2.0.',
  order: 180,
  groupId: 'reference',
  groupTitle: 'Reference',
  markdown: `# API reference

Public surface for Angular **1.2.0**. Mode guides: [Full Checkout](./full-checkout) · [Buttons Only](./buttons-only) · [Headless](./headless). Executable mocks: [Playground](/playground).

## Provider

- \`provideEasyPayments(config: EasyPaymentsConfig)\`
- \`MockPaymentController\` — force mock outcomes when \`enableMockMode: true\`

## Full Checkout

- \`EasyPaymentsComponent\` selector \`<easy-payments>\`

### Inputs

| Name | Type / notes |
|------|----------------|
| \`product\` | Required \`PaymentProduct\` |
| \`methods\` | \`PaymentMethod[]\` allow-list/order |
| \`checkout\` | Optional checkout options |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number \\| string, clamped 320–1200 (default 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | \`Partial<EasyPaymentsTranslations>\` |

### Outputs

| Name | Purpose |
|------|---------|
| \`success\` | Payment succeeded (UX) |
| \`cancel\` | Payment cancelled |
| \`error\` | Payment error |
| \`successContinue\` | Shopper continued from success UI |

## Buttons Only

- \`EasyPaymentButtonsComponent\` selector \`<easy-payment-buttons>\`

### Inputs (high level)

| Name | Type / notes |
|------|----------------|
| \`product\` | Required \`PaymentProduct\` |
| \`methods\` | \`PaymentMethod[]\` allow-list/order |
| \`layout\` | \`vertical\` \\| \`horizontal\` |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`locale\` / \`translations\` | Same locale model as Full Checkout |
| \`checkoutInstanceId\` | Optional stable host id for BNPL redirect ownership |
| \`buttonsAppearance\` / \`visualStyle\` / \`cardButtonAppearance\` | Optional strip / CTA presentation |
| \`bnplConfirmMode\` | Klarna/Affirm confirm strategy |
| \`selectorVisibility\` | \`library\` \\| \`merchant\` |

### Outputs

| Name | Purpose |
|------|---------|
| \`started\` | Payment attempt began |
| \`methodChange\` | Selection changed |
| \`success\` / \`cancel\` / \`error\` | Terminal UX events |

## Headless

- \`EasyPaymentsHeadless\` (injectable) → \`createSession(options)\` → \`HeadlessCheckoutSession\`

### Session highlights

| Member | Purpose |
|--------|---------|
| \`initialize()\` | Resolve availability |
| \`availableMethods\` / \`selectedMethod\` / \`state\` | Signals |
| \`selectMethod\` / \`mount\` / \`confirm\` | Drive payment |
| \`recoverReturn()\` | Klarna/Affirm Stripe redirect recovery |
| \`events.success\` / \`cancel\` / \`error\` / \`started\` / \`pending\` / \`methodChange\` | Observables |
| \`destroy()\` | Tear down |

## Core types

- \`PaymentMethod\`: \`card\` \\| \`paypal\` \\| \`apple-pay\` \\| \`google-pay\` \\| \`klarna\` \\| \`affirm\`
- \`PaymentProduct\`, \`PaymentResult\`, \`PaymentError\`, \`CheckoutOptions\`

> Validated against the local \`vendor/@easy-payments/angular@1.2.0\` declaration file for launch review. Public npm publish is a separate step.
`,
};