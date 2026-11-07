import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function patchMarkdown(file, replacers) {
  const raw = readFileSync(file, 'utf8');
  const marker = 'export const page: DocsPageMeta = ';
  const start = raw.indexOf(marker);
  if (start < 0) {
    throw new Error(`Missing page export in ${file}`);
  }
  const jsonStart = start + marker.length;
  let jsonText = raw.slice(jsonStart).trim();
  if (jsonText.endsWith(';')) {
    jsonText = jsonText.slice(0, -1);
  }
  const data = JSON.parse(jsonText);
  let md = data.markdown;
  for (const [from, to] of replacers) {
    if (typeof from === 'string') {
      if (!md.includes(from) && to !== from) {
        console.warn(`WARN missing string in ${file}: ${from.slice(0, 60)}…`);
      }
      md = md.split(from).join(to);
    } else {
      md = md.replace(from, to);
    }
  }
  data.markdown = md;
  const header = raw.slice(0, start);
  writeFileSync(
    file,
    `${header}export const page: DocsPageMeta = ${JSON.stringify(data, null, 2)};\n`,
  );
}

const shared = [
  [
    `  backend: {
    baseUrl: 'https://api.example.com',
    createPaymentUrl: '/api/payments/create',
    paypalCreateOrderUrl: '/api/paypal/orders',
    paypalCaptureOrderUrl: '/api/paypal/capture',
    klarnaCreatePaymentUrl: '/api/klarna/create',
    affirmCreatePaymentUrl: '/api/affirm/create',
  },`,
    `  backend: {
    createPaymentUrl: 'https://api.example.com/api/payments/create',
    paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
    paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
    klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
    affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
    // confirmPaymentUrl is optional/reserved — not required for standard Stripe Payment Element flows
  },`,
  ],
  [
    `| \`checkout\` | Optional \`successUrl\`, \`cancelUrl\`, customer/shipping hints |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | Clamped 320–1200 (default 640) |
| \`successBehavior\` | Success UI behavior |`,
    `| \`checkout\` | Optional \`CheckoutOptions\` (\`successUrl\`, \`cancelUrl\`, \`successBehavior\`, \`customer\`, \`shipping\`) |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | Clamped 320–1200 (default 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |`,
  ],
  [
    `## Visual style

Optional \`[visualStyle]\` overrides Easy Payments–owned tokens (font, text, surfaces, accent, radius, spacing). It does not restyle Stripe/PayPal/wallet chrome owned by providers.

## Max width`,
    `## Max width`,
  ],
  [
    `| \`checkoutInstanceId\` | Optional instance id |
| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number, clamped 320–1200 |
| \`successBehavior\` | success UI behavior |`,
    `| \`theme\` | \`light\` \\| \`dark\` \\| \`system\` |
| \`appearance\` | \`default\` \\| \`transparent\` |
| \`maxWidth\` | number \\| string, clamped 320–1200 (default 640) |
| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |`,
  ],
  [
    `> Additional lifecycle outputs may exist in later trees. This page focuses on the stable Full Checkout contract described for published`,
    `> Verified against the published npm declaration file for`,
  ],
  [
    `Angular events (\`started\`, \`success\`, \`cancel\`, \`error\`) are **UX signals only**.`,
    `Angular events (\`success\`, \`cancel\`, \`error\`, \`successContinue\`) are **UX signals only**.`,
  ],
  [
    `| \`BACKEND_ERROR\` | Backend request failed |
| \`UNKNOWN\` | Unclassified |`,
    `| \`BACKEND_ERROR\` | Backend request failed |
| \`PROVIDER_NOT_IMPLEMENTED\` | Provider path not implemented |
| \`UNKNOWN\` | Unclassified |`,
  ],
  [
    `      backend: {
        createPaymentUrl: 'https://api.example.com/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/paypal/capture',
      },`,
    `      backend: {
        createPaymentUrl: 'https://api.example.com/api/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
      },`,
  ],
];

for (const version of ['1.0.0', '1.1.0']) {
  const dir = join('src/content/docs/angular', version);
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.page.ts'))) {
    const path = join(dir, file);
    const extras = [];

    if (file === 'getting_started.page.ts') {
      extras.push([
        /> \*\*Evidence note:\*\*[^\n]*/,
        '> **Evidence note:** Verified against the published `@easy-payments/angular@' +
          version +
          '` npm tarball (`types/easy-payments-angular.d.ts`). Full Checkout only — Buttons Only / Headless are not present in this published package.',
      ]);
      if (version === '1.1.0') {
        extras.push([
          /> \*\*1\.1\.0 note:\*\*[^\n]*/,
          '> **1.1.0 note:** Verified against `@easy-payments/angular@1.1.0`. Localization inputs `[locale]` / `[translations]` are present in this published package. See [Localization](./localization).',
        ]);
      }
    }

    if (file === 'api_reference.page.ts' && version === '1.1.0') {
      extras.push([
        `| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | partial overrides |`,
        `| \`successBehavior\` | \`confirmation\` \\| \`event-only\` |
| \`locale\` | \`auto\` \\| \`en\` \\| \`es\` \\| \`pt\` |
| \`translations\` | \`Partial<EasyPaymentsTranslations>\` |`,
      ]);
    }

    if (file === 'configuration.page.ts') {
      extras.push([
        `Treat browser \`amount\` as untrusted display input. Your backend must derive trusted pricing.\n`,
        `Treat browser \`amount\` as untrusted display input. Your backend must derive trusted pricing.

### CheckoutOptions shape (published)

\`\`\`typescript
interface CheckoutOptions {
  successUrl?: string;
  cancelUrl?: string;
  successBehavior?: 'confirmation' | 'event-only';
  customer?: { email?: string; name?: string };
  shipping?: { required?: boolean };
}
\`\`\`

There is **no** \`backend.baseUrl\` field in published ${version}. Provide absolute HTTPS URLs (or app-relative paths your HTTP layer resolves) on each backend URL property.
`,
      ]);
    }

    if (file === 'mock_mode.page.ts') {
      extras.push([
        `## Production

Never enable \`enableMockMode\` in production builds.\n`,
        `## MockPaymentController

Published helper for demo outcomes:

\`\`\`typescript
import { MockPaymentController } from '@easy-payments/angular';

controller.setOutcome('success' | 'cancelled' | 'failed');
controller.setUnavailableMethods(['apple-pay']);
controller.setDelay(500);
controller.reset();
\`\`\`

## Production

Never enable \`enableMockMode\` in production builds.
`,
      ]);
    }

    patchMarkdown(path, [...shared, ...extras]);
    console.log('patched', path);
  }
}
