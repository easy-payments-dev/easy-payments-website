/**
 * Evidence captured from published npm tarballs during W4.1.
 * Artifacts inspected:
 * - @easy-payments/angular@1.0.0 (shasum f0b0f4e8e22d254dc00c9a13cecbd1959dbf15ba)
 * - @easy-payments/angular@1.1.0 (shasum 011f04e6901fdd05c841171381c14df747697a8c)
 *
 * Source of truth: package.json + types/easy-payments-angular.d.ts inside each tarball.
 * Temporary extraction lived outside the app dependency tree.
 */
export type HistoricalAngularVersion = '1.0.0' | '1.1.0';

export interface HistoricalPackageEvidence {
  version: HistoricalAngularVersion;
  packageName: '@easy-payments/angular';
  npmShasum: string;
  peerDependencies: {
    '@angular/common': string;
    '@angular/core': string;
    '@stripe/stripe-js': string;
  };
  exportEntry: '.';
  componentSelector: 'easy-payments';
  componentClass: 'EasyPaymentsComponent';
  providerFn: 'provideEasyPayments';
  hasButtonsOnly: false;
  hasHeadless: false;
  componentInputs: readonly string[];
  componentOutputs: readonly string[];
  paymentMethods: readonly string[];
  themes: readonly string[];
  appearances: readonly string[];
  successBehaviors: readonly string[];
  backendConfigKeys: readonly string[];
  localization: boolean;
}

export const HISTORICAL_ANGULAR_API: Record<
  HistoricalAngularVersion,
  HistoricalPackageEvidence
> = {
  '1.0.0': {
    version: '1.0.0',
    packageName: '@easy-payments/angular',
    npmShasum: 'f0b0f4e8e22d254dc00c9a13cecbd1959dbf15ba',
    peerDependencies: {
      '@angular/common': '>=20.3.0 <23.0.0',
      '@angular/core': '>=20.3.0 <23.0.0',
      '@stripe/stripe-js': '^8.0.0',
    },
    exportEntry: '.',
    componentSelector: 'easy-payments',
    componentClass: 'EasyPaymentsComponent',
    providerFn: 'provideEasyPayments',
    hasButtonsOnly: false,
    hasHeadless: false,
    componentInputs: [
      'product',
      'methods',
      'checkout',
      'theme',
      'appearance',
      'maxWidth',
      'successBehavior',
    ],
    componentOutputs: ['success', 'cancel', 'error', 'successContinue'],
    paymentMethods: [
      'card',
      'paypal',
      'apple-pay',
      'google-pay',
      'klarna',
      'affirm',
    ],
    themes: ['light', 'dark', 'system'],
    appearances: ['default', 'transparent'],
    successBehaviors: ['confirmation', 'event-only'],
    backendConfigKeys: [
      'createPaymentUrl',
      'paypalCreateOrderUrl',
      'paypalCaptureOrderUrl',
      'klarnaCreatePaymentUrl',
      'affirmCreatePaymentUrl',
      'confirmPaymentUrl',
    ],
    localization: false,
  },
  '1.1.0': {
    version: '1.1.0',
    packageName: '@easy-payments/angular',
    npmShasum: '011f04e6901fdd05c841171381c14df747697a8c',
    peerDependencies: {
      '@angular/common': '>=20.3.0 <23.0.0',
      '@angular/core': '>=20.3.0 <23.0.0',
      '@stripe/stripe-js': '^8.0.0',
    },
    exportEntry: '.',
    componentSelector: 'easy-payments',
    componentClass: 'EasyPaymentsComponent',
    providerFn: 'provideEasyPayments',
    hasButtonsOnly: false,
    hasHeadless: false,
    componentInputs: [
      'product',
      'methods',
      'checkout',
      'theme',
      'appearance',
      'maxWidth',
      'successBehavior',
      'locale',
      'translations',
    ],
    componentOutputs: ['success', 'cancel', 'error', 'successContinue'],
    paymentMethods: [
      'card',
      'paypal',
      'apple-pay',
      'google-pay',
      'klarna',
      'affirm',
    ],
    themes: ['light', 'dark', 'system'],
    appearances: ['default', 'transparent'],
    successBehaviors: ['confirmation', 'event-only'],
    backendConfigKeys: [
      'createPaymentUrl',
      'paypalCreateOrderUrl',
      'paypalCaptureOrderUrl',
      'klarnaCreatePaymentUrl',
      'affirmCreatePaymentUrl',
      'confirmPaymentUrl',
    ],
    localization: true,
  },
};

/** APIs confirmed absent from both published 1.0.0 and 1.1.0 declaration files. */
export const HISTORICAL_ABSENT_IN_1_0_AND_1_1 = [
  'EasyPaymentButtonsComponent',
  'easy-payment-buttons',
  'EasyPaymentsHeadless',
  'visualStyle',
  'checkoutInstanceId',
  'baseUrl',
  'started',
  'methodChange',
  'pending',
] as const;

export const HISTORICAL_ERROR_CODES = [
  'CONFIG_MISSING',
  'CONFIG_INVALID',
  'PRODUCT_INVALID',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_NOT_CONFIGURED',
  'PAYMENT_CANCELLED',
  'PAYMENT_FAILED',
  'CARD_DECLINED',
  'AUTHENTICATION_REQUIRED',
  'AUTHENTICATION_FAILED',
  'NETWORK_ERROR',
  'SDK_LOAD_FAILED',
  'BACKEND_ERROR',
  'PROVIDER_NOT_IMPLEMENTED',
  'UNKNOWN',
] as const;
