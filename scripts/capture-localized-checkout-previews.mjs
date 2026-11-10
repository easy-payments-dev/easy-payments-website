/**
 * Capture localized Full Checkout hero previews from the live playground demo.
 * Requires a local site server (default http://127.0.0.1:4200).
 *
 * Usage:
 *   node scripts/capture-localized-checkout-previews.mjs
 *   SITE_URL=http://127.0.0.1:4200 node scripts/capture-localized-checkout-previews.mjs
 */
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'screenshots');
const siteUrl = (process.env.SITE_URL || 'http://127.0.0.1:4200').replace(/\/$/, '');

/** Match existing public/screenshots/checkout-desktop.png (960×858 @ 1.5× of 640 CSS). */
const DEVICE_SCALE = 1.5;
const VIEWPORT = { width: 1280, height: 900 };

const LOCALES = [
  {
    code: 'en',
    productName: 'Premium Plan',
    productDescription: 'One year subscription',
  },
  {
    code: 'es',
    productName: 'Plan Premium',
    productDescription: 'Suscripción de un año',
  },
  {
    code: 'pt',
    productName: 'Plano Premium',
    productDescription: 'Assinatura de um ano',
  },
];

async function fillInput(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  await input.click({ clickCount: 3 });
  await input.fill(value);
  await input.blur();
}

async function waitForCheckoutReady(page, productName) {
  const checkout = page.locator('easy-payments');
  await checkout.waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('heading', { name: productName, exact: true }).waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  await page
    .getByRole('radio', { name: /demo mode/i })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
  // Prefer Card selected; click if needed.
  const card = page.getByRole('radio', { name: /Card|Tarjeta|Cartão/i }).first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  if ((await card.getAttribute('aria-checked')) !== 'true') {
    await card.click();
  }
  await page.waitForTimeout(400);
  return checkout;
}

async function captureLocale(page, locale) {
  await page.goto(`${siteUrl}/playground?demo=full`, {
    waitUntil: 'networkidle',
  });

  // Site chrome: English UI keeps config labels stable; Light theme.
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();

  await page.getByRole('button', { name: 'Reset defaults', exact: true }).click();
  await page.waitForTimeout(300);

  await fillInput(page, 'Name', locale.productName);
  await fillInput(page, 'Description', locale.productDescription);
  await fillInput(page, 'Price (major units)', '99');

  // Checkout component theme + locale (not site language).
  await page
    .locator('#theme-label')
    .locator('xpath=..')
    .getByRole('button', { name: 'light', exact: true })
    .click();
  await page.waitForTimeout(700);
  await page
    .locator('#locale-label')
    .locator('xpath=..')
    .getByRole('button', { name: locale.code, exact: true })
    .click();
  // Remount can briefly clear methods — wait until Card is back.
  const checkout = await waitForCheckoutReady(page, locale.productName);

  const fileName = `checkout-desktop-${locale.code}.png`;
  const outPath = path.join(outDir, fileName);
  await checkout.screenshot({
    path: outPath,
    type: 'png',
    animations: 'disabled',
  });
  console.log(`wrote ${path.relative(root, outPath)}`);
  return outPath;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    colorScheme: 'light',
  });
  const page = await context.newPage();

  try {
    for (const locale of LOCALES) {
      await captureLocale(page, locale);
    }
    // Keep legacy path as English for any remaining references / gallery thumbs.
    await copyFile(
      path.join(outDir, 'checkout-desktop-en.png'),
      path.join(outDir, 'checkout-desktop.png'),
    );
    console.log('wrote public/screenshots/checkout-desktop.png (en copy)');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
