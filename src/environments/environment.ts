/**
 * Environment-independent public site configuration.
 * No secrets, API keys, or payment credentials belong here.
 */
export const environment = {
  production: false,
  /** Canonical public origin (no trailing slash). */
  siteUrl: 'http://localhost:4200',
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
  /**
   * Contact form (public, non-secret values only).
   * Dev: local mock API (npm run contact:local) + official Cloudflare Turnstile test site key
   * (always passes). Never use these in production builds.
   */
  contactTransport: 'local-mock' as 'local-mock' | 'api',
  contactApiUrl: 'http://localhost:8787/contact' as string | null,
  turnstileSiteKey: '1x00000000000000000000AA' as string | null,
  contactEnabled: true as boolean,
} as const;
