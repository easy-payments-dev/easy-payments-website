import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "migration",
  "slug": "migration",
  "title": "Migration from 1.0",
  "description": "Upgrade notes from 1.0.x to 1.1.0.",
  "order": 200,
  "groupId": "reference",
  "groupTitle": "Reference",
  "markdown": "# Migration from 1.0\n\n## 1.0.x → 1.1.0\n\n1.1.0 is a **localization** release.\n\n### What changed\n\n- New `[locale]` input\n- New `[translations]` input\n- Built-in English / Spanish / Portuguese UI dictionaries\n- Intl amount display formatting (no FX conversion)\n\n### What stayed the same\n\n- Package name `@easy-payments/angular`\n- Angular peer range `>=20.3.0 <23.0.0`\n- Full Checkout methods and provider configuration model\n- No currency conversion semantics\n\n### Upgrade steps\n\n1. Install `@easy-payments/angular@1.1.0`\n2. Optionally set `locale` / `translations` on `<easy-payments>`\n3. Regression-test checkout copy in your target locales\n\n### Not in 1.1.0\n\nButtons Only Direct / Headless features belong to **1.2.0** (unpublished RC) and are omitted here.\n"
};
