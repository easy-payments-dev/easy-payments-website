/**
 * Isolated TypeScript compile checks for playground-generated snippets
 * against published @easy-payments/angular 1.0.0 and 1.1.0 declarations.
 *
 * Uses a temporary directory outside the website dependency tree.
 * Does not modify package.json dependencies.
 */
import { execFileSync, execSync } from 'node:child_process'; // execFileSync used for tsc
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'ep-playground-hist-'));
const results = [];

function log(message) {
  console.log(message);
}

function generateFixture(version) {
  const includeLocale = version === '1.1.0';
  const localeAttr = includeLocale ? `\n  locale="auto"` : '';
  const localeField = includeLocale
    ? `\n  readonly locale = 'auto' as const;`
    : '';

  const appConfig = `import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEasyPayments } from '@easy-payments/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideEasyPayments({
      providers: {
        stripe: { publishableKey: 'pk_test_your_publishable_key' },
        paypal: { clientId: 'your_paypal_client_id', currency: 'USD', intent: 'capture' },
        applePay: { merchantName: 'Your Store', countryCode: 'US' },
        googlePay: { merchantName: 'Your Store', environment: 'TEST', countryCode: 'US' },
        klarna: { purchaseCountry: 'US' },
        affirm: { purchaseCountry: 'US' },
      },
      backend: {
        createPaymentUrl: 'https://api.example.com/api/payments/create',
        paypalCreateOrderUrl: 'https://api.example.com/api/paypal/orders',
        paypalCaptureOrderUrl: 'https://api.example.com/api/paypal/capture',
        klarnaCreatePaymentUrl: 'https://api.example.com/api/klarna/create',
        affirmCreatePaymentUrl: 'https://api.example.com/api/affirm/create',
      },
      enableMockMode: true,
    }),
  ],
};
`;

  const component = `import { Component } from '@angular/core';
import {
  EasyPaymentsComponent,
  PaymentError,
  PaymentMethod,
  PaymentProduct,
  PaymentResult,
} from '@easy-payments/angular';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [EasyPaymentsComponent],
  template: \`
    <easy-payments
      [product]="product"
      [methods]="methods"
      theme="system"
      appearance="default"
      [maxWidth]="640"
      successBehavior="confirmation"${localeAttr}
      (success)="onSuccess($event)"
      (cancel)="onCancel($event)"
      (error)="onError($event)"
      (successContinue)="onSuccessContinue($event)"
    />
  \`,
})
export class CheckoutComponent {
  readonly product: PaymentProduct = {
    id: 'premium',
    name: 'Jose\\'s Plan',
    description: 'Line with \\\\ backslash',
    amount: 99,
    currency: 'USD',
    quantity: 1,
  };

  readonly methods: PaymentMethod[] = [
    'card',
    'paypal',
    'apple-pay',
    'google-pay',
    'klarna',
    'affirm',
  ];${localeField}

  onSuccess(result: PaymentResult): void {
    console.log('success', result);
  }

  onCancel(result: PaymentResult): void {
    console.log('cancel', result);
  }

  onError(error: PaymentError): void {
    console.error('error', error.code, error.message);
  }

  onSuccessContinue(result: PaymentResult): void {
    console.log('successContinue', result);
  }
}
`;

  return { appConfig, component };
}

function verifyVersion(version) {
  const dir = join(work, version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: `ep-playground-check-${version}`,
        private: true,
        type: 'module',
      },
      null,
      2,
    ),
  );

  log(`Installing @easy-payments/angular@${version} in isolated temp dir...`);
  const packages = [
    `@easy-payments/angular@${version}`,
    '@angular/core@22',
    '@angular/common@22',
    '@angular/compiler@22',
    '@stripe/stripe-js@8',
    'rxjs@7',
    'typescript@5.9',
  ];
  execSync(
    `npm install --prefix "${dir}" ${packages.join(' ')} --ignore-scripts --no-package-lock`,
    { stdio: 'inherit' },
  );

  const fixture = generateFixture(version);
  writeFileSync(join(dir, 'app.config.ts'), fixture.appConfig);
  writeFileSync(join(dir, 'checkout.component.ts'), fixture.component);
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          skipLibCheck: true,
          experimentalDecorators: true,
          useDefineForClassFields: false,
          lib: ['ES2022', 'DOM'],
          types: [],
          noEmit: true,
        },
        include: ['*.ts'],
      },
      null,
      2,
    ),
  );

  const tscJs = join(dir, 'node_modules', 'typescript', 'lib', 'tsc.js');
  assertExists(tscJs, `typescript missing for ${version}`);

  try {
    execFileSync(process.execPath, [tscJs, '-p', dir], { stdio: 'pipe' });
    results.push({ version, ok: true, detail: 'compile succeeded' });
    log(`OK  ${version}: generated playground examples compile`);
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? '';
    const stderr = error.stderr?.toString?.() ?? '';
    results.push({
      version,
      ok: false,
      detail: `${stdout}\n${stderr}`.trim() || String(error),
    });
    log(`FAIL ${version}: compile failed`);
    console.error(results.at(-1).detail);
  }

  // Negative check: 1.0.0 must reject locale.
  if (version === '1.0.0') {
    writeFileSync(
      join(dir, 'locale-negative.ts'),
      `import { EasyPaymentsComponent } from '@easy-payments/angular';
const _probe: typeof EasyPaymentsComponent.prototype extends { locale: infer L } ? L : never = 'auto';
`,
    );
    // Prefer declaration text evidence for locale absence.
    const dtsCandidates = [
      join(dir, 'node_modules', '@easy-payments', 'angular', 'types', 'easy-payments-angular.d.ts'),
      join(dir, 'node_modules', '@easy-payments', 'angular', 'fesm2022', 'easy-payments-angular.d.ts'),
    ];
    const dtsPath = dtsCandidates.find((candidate) => existsSync(candidate));
    if (!dtsPath) {
      results.push({
        version: '1.0.0-locale-negative',
        ok: false,
        detail: 'Could not locate 1.0.0 declaration file',
      });
    } else {
      const dts = readFileSync(dtsPath, 'utf8');
      // Provider BNPL configs may mention locale hints; the public component
      // localization API (EasyPaymentsLocale / translations input) is 1.1.0+.
      const hasPublicLocaleApi =
        /type EasyPaymentsLocale\b/.test(dts) ||
        /EasyPaymentsTranslations\b/.test(dts) ||
        /readonly locale\b/.test(dts);
      results.push({
        version: '1.0.0-locale-negative',
        ok: !hasPublicLocaleApi,
        detail: hasPublicLocaleApi
          ? 'Unexpected public localization API in 1.0.0 declarations'
          : 'public localization API absent from 1.0.0 declarations',
      });
      log(
        hasPublicLocaleApi
          ? 'FAIL 1.0.0 public localization API unexpectedly present'
          : 'OK  1.0.0 public localization API absent from declarations',
      );
    }
  }
}

function assertExists(path, message) {
  if (!existsSync(path)) {
    throw new Error(message);
  }
}

try {
  verifyVersion('1.0.0');
  verifyVersion('1.1.0');
} finally {
  // Keep temp on failure for debugging via EP_KEEP_TMP=1
  if (process.env.EP_KEEP_TMP !== '1') {
    rmSync(work, { recursive: true, force: true });
  } else {
    log(`Kept temp workspace: ${work}`);
  }
}

const failed = results.filter((entry) => !entry.ok);
writeFileSync(
  join(root, 'scripts', 'playground-historical-results.json'),
  JSON.stringify({ work, results }, null, 2),
);

if (failed.length) {
  console.error('Historical playground verification failed.');
  process.exit(1);
}

log('Historical playground verification passed for 1.0.0 and 1.1.0.');
