/**
 * Capture localized Full Checkout gallery previews from the live playground demo.
 * Requires a local site server (default http://127.0.0.1:4200).
 *
 * Usage:
 *   node scripts/capture-localized-checkout-previews.mjs
 *   SITE_URL=http://127.0.0.1:4200 node scripts/capture-localized-checkout-previews.mjs
 *
 * Variants:
 *   - desktop / light — default method order, Card selected (light reuses desktop)
 *   - methods — PayPal-first order with Card selected (matches origin/main gallery)
 *   - dark — dark theme, Card selected
 *   - mobile — narrow maxWidth stack, Card selected
 *
 * Legacy unsuffixed public URLs are refreshed as English copies for external refs.
 */
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'screenshots');
const siteUrl = (process.env.SITE_URL || 'http://127.0.0.1:4200').replace(/\/$/, '');

const DEVICE_SCALE = 1.5;

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

/** Matches origin/main Methods gallery: PayPal first, Card selected. */
const METHODS_GALLERY_ORDER = [
  'paypal',
  'card',
  'apple-pay',
  'google-pay',
  'klarna',
  'affirm',
];

const METHOD_CHECKBOX_LABELS = {
  card: 'Card',
  paypal: 'PayPal',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
  klarna: 'Klarna',
  affirm: 'Affirm',
};

/** Primary captures — aliases reuse the named capture for the same scenario. */
const VARIANTS = [
  {
    id: 'desktop',
    theme: 'light',
    maxWidth: 640,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    aliases: ['light'],
  },
  {
    id: 'methods',
    theme: 'light',
    maxWidth: 640,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    methodOrder: METHODS_GALLERY_ORDER,
    aliases: [],
  },
  {
    id: 'dark',
    theme: 'dark',
    maxWidth: 640,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
    aliases: [],
  },
  {
    id: 'mobile',
    theme: 'light',
    maxWidth: 320,
    // Keep a desktop chrome viewport so playground controls stay reachable;
    // the checkout itself stacks via maxWidth 320 (matches 480px @ 1.5×).
    viewport: { width: 1280, height: 1400 },
    colorScheme: 'light',
    aliases: [],
  },
];

async function fillInput(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  await input.click({ clickCount: 3 });
  await input.fill(String(value));
  await input.blur();
}

/**
 * Rebuild playground method allow-list in the given visual order.
 * Checkboxes append on enable, so clear all then re-check in sequence.
 */
async function setMethodOrder(page, order) {
  for (const id of Object.keys(METHOD_CHECKBOX_LABELS)) {
    const checkbox = page.getByRole('checkbox', {
      name: METHOD_CHECKBOX_LABELS[id],
      exact: true,
    });
    if (await checkbox.isChecked()) {
      await checkbox.click();
      await page.waitForTimeout(150);
    }
  }
  for (const id of order) {
    const label = METHOD_CHECKBOX_LABELS[id];
    if (!label) {
      throw new Error(`Unknown method id for capture order: ${id}`);
    }
    await page.getByRole('checkbox', { name: label, exact: true }).click();
    await page.waitForTimeout(200);
  }
}

async function assertMethodOrder(page, expectedOrder) {
  const actual = await page.evaluate(() =>
    [...document.querySelectorAll('easy-payments [role="radio"]')].map((el) => {
      const label =
        el.querySelector('.ep-tile__label')?.textContent?.trim() ||
        el.getAttribute('aria-label') ||
        '';
      if (/paypal/i.test(label)) return 'paypal';
      if (/tarjeta|cart[aã]o|card/i.test(label)) return 'card';
      if (/apple/i.test(label)) return 'apple-pay';
      if (/google/i.test(label)) return 'google-pay';
      if (/klarna/i.test(label)) return 'klarna';
      if (/affirm/i.test(label)) return 'affirm';
      return label;
    }),
  );
  if (actual.join(',') !== expectedOrder.join(',')) {
    throw new Error(
      `Method order mismatch: expected [${expectedOrder.join(', ')}] got [${actual.join(', ')}]`,
    );
  }
}

async function waitForCheckoutReady(page, productName) {
  const checkout = page.locator('easy-payments');
  await checkout.waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('heading', { name: productName, exact: true }).waitFor({
    state: 'visible',
    timeout: 30_000,
  });

  // Library aria: en "demo mode"; es/pt "modo demo".
  const methodRadio = page
    .getByRole('radio', { name: /demo mode|modo demo/i })
    .first();
  // Theme/locale remounts can briefly clear methods — poll with a remount nudge.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await methodRadio.waitFor({ state: 'visible', timeout: 8_000 });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.getByRole('button', { name: 'Full Checkout', exact: true }).click();
      await page.waitForTimeout(700);
    }
  }

  const card = page.getByRole('radio', { name: /Card|Tarjeta|Cartão/i }).first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  if ((await card.getAttribute('aria-checked')) !== 'true') {
    await card.click();
  }
  await page.waitForTimeout(400);
  return checkout;
}

/**
 * Assert the rendered checkout surface matches the requested theme.
 * Checks host class + panel / unselected payment-tile luminance so we never
 * ship a light capture under a dark gallery slot (or vice versa).
 * Selected tiles use a translucent blue wash — sample unselected tiles.
 */
async function assertCheckoutTheme(page, expectedTheme) {
  const result = await page.evaluate((theme) => {
    const host = document.querySelector('easy-payments');
    if (!host) {
      return { ok: false, reason: 'missing easy-payments host' };
    }
    const panel = host.querySelector('.ep-checkout') || host;
    const unselectedTile =
      host.querySelector('.ep-tile:not(.ep-tile--selected)') ||
      [...host.querySelectorAll('[role="radio"]')].find(
        (el) => el.getAttribute('aria-checked') !== 'true',
      );

    const readLum = (el) => {
      if (!el) {
        return null;
      }
      const bg = getComputedStyle(el).backgroundColor;
      const match = bg.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i,
      );
      if (!match) {
        return null;
      }
      const r = Number(match[1]);
      const g = Number(match[2]);
      const b = Number(match[3]);
      const a = match[4] === undefined ? 1 : Number(match[4]);
      // Opaque RGB only — translucent selected washes are ignored elsewhere.
      if (a < 0.85) {
        return null;
      }
      return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    };

    const className = host.className || '';
    const hasThemeClass =
      theme === 'dark'
        ? /\bep-theme-dark\b/.test(className)
        : /\bep-theme-light\b/.test(className) ||
          !/\bep-theme-dark\b/.test(className);
    const panelLum = readLum(panel);
    const tileLum = readLum(unselectedTile);
    const darkOk =
      theme === 'dark' &&
      hasThemeClass &&
      panelLum !== null &&
      panelLum < 80 &&
      tileLum !== null &&
      tileLum < 80;
    const lightOk =
      theme === 'light' &&
      hasThemeClass &&
      panelLum !== null &&
      panelLum > 200 &&
      tileLum !== null &&
      tileLum > 180;

    return {
      ok: theme === 'dark' ? darkOk : lightOk,
      className,
      panelLum,
      tileLum,
      reason:
        theme === 'dark'
          ? 'expected dark panel + unselected tiles'
          : 'expected light panel + unselected tiles',
    };
  }, expectedTheme);

  if (!result.ok) {
    throw new Error(
      `Checkout theme assertion failed for "${expectedTheme}": ` +
        `class="${result.className}", panelLum=${result.panelLum}, tileLum=${result.tileLum} (${result.reason})`,
    );
  }
}

async function prepareCheckout(page, locale, variant) {
  await page.goto(`${siteUrl}/playground?demo=full`, {
    waitUntil: 'networkidle',
  });

  await page.getByRole('button', { name: 'English', exact: true }).click();
  // Site chrome Light keeps controls readable; checkout theme is set below.
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('button', { name: 'Reset defaults', exact: true }).click();
  await page.waitForTimeout(300);

  await fillInput(page, 'Name', locale.productName);
  await fillInput(page, 'Description', locale.productDescription);
  await fillInput(page, 'Price (major units)', '99');
  await fillInput(page, 'maxWidth (320–1200)', variant.maxWidth);

  if (variant.methodOrder?.length) {
    await setMethodOrder(page, variant.methodOrder);
    await page.waitForTimeout(500);
  }

  await page
    .locator('#theme-label')
    .locator('xpath=..')
    .getByRole('button', { name: variant.theme, exact: true })
    .click();
  await page.waitForTimeout(700);

  await page
    .locator('#locale-label')
    .locator('xpath=..')
    .getByRole('button', { name: locale.code, exact: true })
    .click();

  const checkout = await waitForCheckoutReady(page, locale.productName);

  // Locale remount can briefly reset theme — re-apply and verify before shot.
  const themeActive = await page
    .locator('#theme-label')
    .locator('xpath=..')
    .getByRole('button', { name: variant.theme, exact: true })
    .evaluate((el) => el.classList.contains('is-active'));
  if (!themeActive) {
    await page
      .locator('#theme-label')
      .locator('xpath=..')
      .getByRole('button', { name: variant.theme, exact: true })
      .click();
    await page.waitForTimeout(700);
    await waitForCheckoutReady(page, locale.productName);
  }

  // Method order can reset on remount — re-apply if this variant needs a custom order.
  if (variant.methodOrder?.length) {
    const orderOk = await page
      .evaluate((expected) => {
        const ids = [...document.querySelectorAll('easy-payments [role="radio"]')].map(
          (el) => {
            const label =
              el.querySelector('.ep-tile__label')?.textContent?.trim() ||
              el.getAttribute('aria-label') ||
              '';
            if (/paypal/i.test(label)) return 'paypal';
            if (/tarjeta|cart[aã]o|\bcard\b/i.test(label)) return 'card';
            if (/apple/i.test(label)) return 'apple-pay';
            if (/google/i.test(label)) return 'google-pay';
            if (/klarna/i.test(label)) return 'klarna';
            if (/affirm/i.test(label)) return 'affirm';
            return label;
          },
        );
        return ids.join(',') === expected.join(',');
      }, variant.methodOrder)
      .catch(() => false);
    if (!orderOk) {
      await setMethodOrder(page, variant.methodOrder);
      await waitForCheckoutReady(page, locale.productName);
    }
    await assertMethodOrder(page, variant.methodOrder);
  }

  await assertCheckoutTheme(page, variant.theme);
  return checkout;
}

async function captureVariant(browser, locale, variant) {
  const context = await browser.newContext({
    viewport: variant.viewport,
    deviceScaleFactor: DEVICE_SCALE,
    colorScheme: variant.colorScheme,
  });
  const page = await context.newPage();
  try {
    const checkout = await prepareCheckout(page, locale, variant);
    const fileName = `checkout-${variant.id}-${locale.code}.png`;
    const outPath = path.join(outDir, fileName);
    await checkout.screenshot({
      path: outPath,
      type: 'png',
      animations: 'disabled',
    });
    console.log(`wrote ${path.relative(root, outPath)}`);

    for (const alias of variant.aliases) {
      const aliasPath = path.join(
        outDir,
        `checkout-${alias}-${locale.code}.png`,
      );
      await copyFile(outPath, aliasPath);
      console.log(
        `wrote ${path.relative(root, aliasPath)} (reuse ${variant.id})`,
      );
    }
    return outPath;
  } finally {
    await context.close();
  }
}

async function writeLegacyEnglishCopies(ids = ['desktop', 'mobile', 'dark', 'light', 'methods']) {
  for (const id of ids) {
    const source = path.join(outDir, `checkout-${id}-en.png`);
    const legacy = path.join(outDir, `checkout-${id}.png`);
    await copyFile(source, legacy);
    console.log(`wrote ${path.relative(root, legacy)} (en copy)`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const only = (process.env.CAPTURE_ONLY || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const variants = only.length
    ? VARIANTS.filter((variant) => only.includes(variant.id))
    : VARIANTS;
  if (variants.length === 0) {
    throw new Error(`CAPTURE_ONLY matched no variants: ${only.join(',')}`);
  }

  try {
    for (const variant of variants) {
      for (const locale of LOCALES) {
        await captureVariant(browser, locale, variant);
      }
    }
    const legacyIds = only.length
      ? [
          ...new Set(
            variants.flatMap((variant) => [variant.id, ...(variant.aliases || [])]),
          ),
        ]
      : undefined;
    await writeLegacyEnglishCopies(legacyIds);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
