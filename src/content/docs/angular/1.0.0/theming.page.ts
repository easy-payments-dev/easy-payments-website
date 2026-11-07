import { DocsPageMeta } from '../../../../app/core/docs/docs.types';

export const page: DocsPageMeta = {
  "id": "theming",
  "slug": "theming",
  "title": "Theming",
  "description": "Theme, appearance, and visual style.",
  "order": 60,
  "groupId": "configuration",
  "groupTitle": "Configuration",
  "markdown": "# Theming\n\n## Theme\n\n```html\n<easy-payments theme=\"light\" [product]=\"product\" [methods]=\"methods\" />\n<easy-payments theme=\"dark\" [product]=\"product\" [methods]=\"methods\" />\n<easy-payments theme=\"system\" [product]=\"product\" [methods]=\"methods\" />\n```\n\n- `light` / `dark` force Easy Payments colors\n- `system` follows `prefers-color-scheme` and updates live\n\n## Appearance\n\n```html\n<easy-payments appearance=\"default\" ... />\n<easy-payments appearance=\"transparent\" ... />\n```\n\n| Value | Effect |\n|-------|--------|\n| `default` | Built-in outer shell |\n| `transparent` | Removes outer chrome for embedding in your layout |\n\n`theme` and `appearance` are independent.\n\n## Max width\n\n`[maxWidth]` is clamped between **320** and **1200** (default **640**).\n"
};
