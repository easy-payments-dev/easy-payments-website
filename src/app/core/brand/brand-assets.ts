/**
 * Canonical public paths for Easy Payments brand assets shipped with this website.
 * Paths are relative to the site root (Angular `public/` output).
 */
export const BRAND_ASSETS = {
  mark64: 'brand/mark-64.png',
  mark128: 'brand/mark-128.png',
  logoLockup: 'brand/logo-lockup-640.png',
  faviconIco: 'favicon.ico',
  faviconSvg: 'favicon.svg',
  favicon16: 'favicon-16x16.png',
  favicon32: 'favicon-32x32.png',
  appleTouchIcon: 'apple-touch-icon.png',
  icon192: 'icon-192.png',
  icon512: 'icon-512.png',
  ogImage: 'og-image.png',
  manifest: 'site.webmanifest',
} as const;

export type BrandAssetKey = keyof typeof BRAND_ASSETS;
