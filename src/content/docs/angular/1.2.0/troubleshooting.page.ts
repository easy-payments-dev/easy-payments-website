import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "troubleshooting",
  "slug": "troubleshooting",
  "title": "Troubleshooting",
  "description": "Common setup failures and checks.",
  "order": 170,
  "groupId": "guides",
  "groupTitle": "Guides",
  "markdown": "# Troubleshooting\n\n## Checkout does not render a method\n\n- Confirm the method id is listed in `[methods]`\n- Confirm the matching provider block exists in `provideEasyPayments`\n- Check device/browser support for wallets\n- Try mock mode to separate UI issues from provider onboarding\n\n## Payments fail immediately\n\n- Inspect `PaymentError.code`\n- Verify backend URLs are HTTPS and reachable\n- Confirm TEST vs live keys match the environment\n- Ensure secret keys are not missing on the server\n\n## Success in browser but no order\n\nExpected if you fulfill only from client events. Wire webhook verification or server-side status checks.\n\n## Theme looks wrong\n\n- Use `light` / `dark` / `system` (not `white`)\n- Remember provider-owned chrome is not fully controlled by Easy Payments tokens\n"
};
