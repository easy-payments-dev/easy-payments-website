/**
 * Production public site configuration.
 * No secrets, API keys, or payment credentials belong here.
 */
export const environment = {
  production: true,
  /** Canonical public origin (no trailing slash). Update if the production hostname changes. */
  siteUrl: 'https://www.easy-payments.dev',
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
  docsLatestAngularVersion: '1.2.0',
  angularPackageName: '@easy-payments/angular',
  /**
   * Contact form (public, non-secret values only).
   * Production MUST use 'api'. While contactApiUrl / turnstileSiteKey are null the contact
   * page shows a NOT OPERATIONAL notice and no submit form. Set the real values at build time
   * (e.g. a deploy-time replacement of this file) once the backend is deployed — see
   * infra/contact/README.md. Local mock transport is rejected in production builds.
   */
  contactTransport: 'api' as 'local-mock' | 'api',
  contactApiUrl: null as string | null,
  turnstileSiteKey: null as string | null,
  contactEnabled: false as boolean,
  /** Set to a https PayPal.Me (or similar) URL to show the PayPal support button. */
  paypalSupportUrl: null as string | null,
} as const;
