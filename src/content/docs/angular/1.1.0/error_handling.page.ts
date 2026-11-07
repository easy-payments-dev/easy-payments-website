import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "error-handling",
  "slug": "error-handling",
  "title": "Error handling",
  "description": "PaymentError codes and UX events.",
  "order": 150,
  "groupId": "guides",
  "groupTitle": "Guides",
  "markdown": "# Error handling\n\nListen for `error` on `<easy-payments>` and prefer stable `PaymentError.code` values when logging.\n\n## Common codes\n\n| Code | Meaning |\n|------|---------|\n| `CONFIG_MISSING` | Required configuration absent |\n| `CONFIG_INVALID` | Configuration rejected |\n| `PRODUCT_INVALID` | Product payload invalid |\n| `PROVIDER_UNAVAILABLE` | Method unavailable in this environment |\n| `PROVIDER_NOT_CONFIGURED` | Provider not configured |\n| `PAYMENT_CANCELLED` | Shopper cancelled |\n| `PAYMENT_FAILED` | Payment failed |\n| `CARD_DECLINED` | Card declined |\n| `AUTHENTICATION_REQUIRED` / `AUTHENTICATION_FAILED` | Auth challenges |\n| `NETWORK_ERROR` | Network failure |\n| `SDK_LOAD_FAILED` | Provider SDK failed to load |\n| `BACKEND_ERROR` | Backend request failed |\n| `PROVIDER_NOT_IMPLEMENTED` | Provider path not implemented |\n| `UNKNOWN` | Unclassified |\n\nPrefer `code` over free-form `message` for metrics and alerts.\n\nConfig failures should surface as `error`, not shopper `cancel`.\n"
};
