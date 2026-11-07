import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "localization",
  "slug": "localization",
  "title": "Localization",
  "description": "UI locales added in Angular 1.1.0.",
  "order": 65,
  "groupId": "configuration",
  "groupTitle": "Configuration",
  "markdown": "# Localization\n\nAdded in **Angular 1.1.0**.\n\n## Locale input\n\n```html\n<easy-payments\n  locale=\"auto\"\n  [product]=\"product\"\n  [methods]=\"methods\"\n/>\n```\n\nAllowed values: `auto` | `en` | `es` | `pt` (default `auto`).\n\nBrowser auto-detect maps:\n\n- `es-*` → Spanish\n- `pt-*` → Portuguese\n- `en-*` → English\n- other languages → English fallback\n\n## Translations\n\nOptional `[translations]` supplies partial string overrides. Resolution order: override → locale dictionary → English.\n\n## Amount display\n\nAmounts use `Intl` formatting for the active locale **without converting currency**. `product.amount` and `product.currency` stay unchanged.\n\n## Provider surfaces\n\nProvider-owned sheets (wallets, bank UIs) may follow their own locale rules and are not fully controlled by Easy Payments.\n"
};
