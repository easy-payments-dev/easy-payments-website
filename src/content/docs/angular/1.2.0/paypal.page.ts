import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "paypal",
  "slug": "paypal",
  "title": "PayPal",
  "description": "PayPal buttons with server create/capture.",
  "order": 80,
  "groupId": "integrations",
  "groupTitle": "Integrations",
  "markdown": "# PayPal\n\n## Configure\n\n```typescript\nprovideEasyPayments({\n  providers: {\n    paypal: {\n      clientId: 'your-paypal-client-id',\n      currency: 'USD',\n      intent: 'capture',\n    },\n  },\n  backend: {\n    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',\n    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',\n  },\n});\n```\n\n## Credentials\n\n| In Angular | On server only |\n|------------|----------------|\n| PayPal Client ID | PayPal Client Secret |\n| | Webhook verification credentials |\n\n## Pricing\n\nTreat client `product.amount` as untrusted. Create/capture routes should price from your catalog.\n"
};
