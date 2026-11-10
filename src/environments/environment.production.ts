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
   * Production MUST use 'api'. Local mock transport is rejected in production builds.
   * Turnstile secret stays in AWS SSM — only the public site key belongs here.
   */
  contactTransport: 'api' as 'local-mock' | 'api',
  contactApiUrl:
    'https://7ako2mwoa2.execute-api.us-east-1.amazonaws.com/contact' as string | null,
  turnstileSiteKey: '0x4AAAAAAF6g-jRSkAYBnLoq' as string | null,
  contactEnabled: true as boolean,
  /**
   * Voluntary PayPal.Me support link (plain external URL — no PayPal SDK).
   * Same public profile as the locale/country variant; keep the clean URL in production.
   * Set to null to hide the PayPal button.
   */
  paypalSupportUrl: 'https://paypal.me/JoseVicente07' as string | null,
} as const;
