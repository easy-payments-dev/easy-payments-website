import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "mock-mode",
  "slug": "mock-mode",
  "title": "Mock mode",
  "description": "Local demos without real charges.",
  "order": 130,
  "groupId": "guides",
  "groupTitle": "Guides",
  "markdown": "# Mock mode\n\nEnable mock adapters for local UI demos:\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    stripe: { publishableKey: 'pk_test_demo' },\n  },\n  enableMockMode: true,\n});\n```\n\n## Behavior\n\n- All configured methods use mock adapters\n- **No real money** is processed\n- Useful for screenshots, layout QA, and event wiring\n\n## MockPaymentController\n\nPublished helper for demo outcomes:\n\n```typescript\nimport { MockPaymentController } from '@easy-payments/angular';\n\ncontroller.setOutcome('success' | 'cancelled' | 'failed');\ncontroller.setUnavailableMethods(['apple-pay']);\ncontroller.setDelay(500);\ncontroller.reset();\n```\n\n## Production\n\nNever enable `enableMockMode` in production builds.\n"
};
