/**
 * Environment-independent public site configuration.
 * No secrets, API keys, or payment credentials belong here.
 */
export const environment = {
  production: false,
  siteName: 'Easy Payments',
  /** Official visual wordmark casing from the Easy Payments logo. */
  wordmark: 'easy payments',
  tagline: 'PAYMENTS MADE SIMPLE',
  githubUrl: 'https://github.com/easy-payments-dev',
  githubWebsiteUrl: 'https://github.com/easy-payments-dev/easy-payments-website',
  githubAngularUrl: 'https://github.com/easy-payments-dev/easy-payments-angular',
  npmAngularUrl: 'https://www.npmjs.com/package/@easy-payments/angular',
  angularSecurityDocsUrl:
    'https://github.com/easy-payments-dev/easy-payments-angular/blob/master/docs/security.md',
  license: 'MIT',
  docsLatestAngularVersion: '1.1.0',
  angularPackageName: '@easy-payments/angular',
} as const;
