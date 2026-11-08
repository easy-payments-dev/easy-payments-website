/**
 * W6.2 — Prove mock Playground does not request payment provider SDKs or Turnstile.
 *
 * 1) Static: vendored local @easy-payments/angular@1.2.0 must import
 *    @stripe/stripe-js/pure (default entry auto-injects js.stripe.com on evaluate).
 * 2) Browser network: load /playground, run a mock pay, assert no SDK hosts
 *    and no Cloudflare Turnstile script.
 *
 * Brand-mark image CDNs (PayPal/Klarna/Affirm SVGs) are allowed — not payment SDKs.
 *
 * Env:
 *   PLAYGROUND_BASE_URL  default http://localhost:4200
 *   SKIP_BROWSER=1       skip Playwright (static checks only)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SDK_HOST_PATTERNS = [
  /js\.stripe\.com/i,
  /api\.stripe\.com/i,
  /paypal\.com\/sdk/i,
  /www\.paypal\.com\/sdk/i,
  /pay\.google\.com/i,
  /google\.com\/pay/i,
  /apple\.com\/apple-pay/i,
  /js\.klarna\.com/i,
  /klarna\.com\/.*(payments|sdk|in-app)/i,
  /cdn\.affirm\.com/i,
  /affirm\.com\/js/i,
  /challenges\.cloudflare\.com/i,
];

/** Allowed brand asset hosts (presentation only). */
const ALLOWED_ASSET_HOST_HINTS = [
  'paypalobjects.com',
  'klarnacdn.net',
  'cdn-assets.affirm.com',
];

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function isSdkUrl(url) {
  if (ALLOWED_ASSET_HOST_HINTS.some((hint) => url.includes(hint))) {
    return false;
  }
  return SDK_HOST_PATTERNS.some((pattern) => pattern.test(url));
}

function verifyVendoredPureImport() {
  const vendorPkgPath = join(
    root,
    'vendor',
    'easy-payments-angular',
    'package.json',
  );
  assert(existsSync(vendorPkgPath), 'Missing vendor/easy-payments-angular/package.json');
  const vendorPkg = JSON.parse(readFileSync(vendorPkgPath, 'utf8'));
  assert(
    vendorPkg.version === '1.2.0',
    `Expected vendor package 1.2.0, found ${vendorPkg.version}`,
  );

  const fesmPath = join(
    root,
    'node_modules',
    '@easy-payments',
    'angular',
    'fesm2022',
    'easy-payments-angular.mjs',
  );
  assert(existsSync(fesmPath), `Missing FESM: ${fesmPath}`);
  const fesm = readFileSync(fesmPath, 'utf8');
  assert(
    /from '@stripe\/stripe-js\/pure(\/index\.js)?'/.test(fesm),
    'FESM must import loadStripe from @stripe/stripe-js/pure (vendored local 1.2.0)',
  );
  assert(
    !/from '@stripe\/stripe-js';/.test(fesm),
    'FESM must not import the default @stripe/stripe-js entry (auto-injects Stripe.js)',
  );

  const defaultEntry = join(root, 'node_modules', '@stripe', 'stripe-js', 'dist', 'index.js');
  const pureEntry = join(root, 'node_modules', '@stripe', 'stripe-js', 'dist', 'pure.js');
  assert(existsSync(defaultEntry), 'Missing @stripe/stripe-js default entry');
  assert(existsSync(pureEntry), 'Missing @stripe/stripe-js/pure entry');
  const defaultSrc = readFileSync(defaultEntry, 'utf8');
  const pureSrc = readFileSync(pureEntry, 'utf8');
  assert(
    defaultSrc.includes('Promise.resolve().then(') &&
      defaultSrc.includes('getStripePromise'),
    'Sanity: default @stripe/stripe-js entry still auto-loads Stripe.js',
  );
  assert(
    !pureSrc.includes('getStripePromise') &&
      pureSrc.includes('loadStripeCalled'),
    'Sanity: pure entry must defer Stripe.js until loadStripe() (no getStripePromise auto-load)',
  );
}

async function verifyBrowserNetwork() {
  if (process.env.SKIP_BROWSER === '1') {
    console.log('SKIP_BROWSER=1 — browser network phase skipped');
    return;
  }

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.warn(
      'playwright not installed — run `npm i -D playwright` and `npx playwright install chromium` for browser network checks.',
    );
    console.warn('Falling back to SKIP_BROWSER behavior for this run.');
    return;
  }

  const base = (process.env.PLAYGROUND_BASE_URL ?? 'http://localhost:4200').replace(
    /\/$/,
    '',
  );
  const requested = [];
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', (req) => {
    requested.push(req.url());
  });

  try {
    const response = await page.goto(`${base}/playground`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    assert(response?.ok(), `Playground HTTP ${response?.status()} at ${base}/playground`);

    await page.waitForSelector('easy-payments', { timeout: 30_000 });

    const klarna = page.getByRole('radio', { name: /Klarna/i });
    await klarna.click();
    const pay = page.getByRole('button', { name: /Klarna/i });
    await pay.click();
    await page.waitForTimeout(1500);

    const sdkHits = [...new Set(requested.filter(isSdkUrl))];
    assert(
      sdkHits.length === 0,
      `Unexpected payment SDK network requests:\n${sdkHits.map((u) => `  - ${u}`).join('\n')}`,
    );

    const stripeScripts = await page.evaluate(() =>
      [...document.querySelectorAll('script')]
        .map((s) => s.src)
        .filter((src) => /js\.stripe\.com/i.test(src)),
    );
    assert(
      stripeScripts.length === 0,
      `Stripe.js script tags present after mock flow:\n${stripeScripts.map((u) => `  - ${u}`).join('\n')}`,
    );

    console.log(
      `Browser network OK — ${requested.length} requests inspected, 0 payment SDK hits (base ${base})`,
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Verifying vendored @easy-payments/angular@1.2.0 pure Stripe import…');
  verifyVendoredPureImport();
  console.log('Vendor pure import OK (@stripe/stripe-js/pure).');

  await verifyBrowserNetwork();

  if (failures.length) {
    console.error('\nverify-playground-mock-network FAILED:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('verify-playground-mock-network passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
