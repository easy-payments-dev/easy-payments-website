/**
 * Production public site configuration.
 * No secrets, API keys, or payment credentials belong here.
 */
export const environment = {
  production: true,
  siteName: 'Easy Payments',
  tagline: 'PAYMENTS MADE SIMPLE',
  githubUrl: 'https://github.com/easy-payments',
  docsLatestAngularVersion: '1.1.0',
} as const;
