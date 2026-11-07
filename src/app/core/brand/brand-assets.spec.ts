import { BRAND_ASSETS } from './brand-assets';

describe('BRAND_ASSETS', () => {
  it('references the official favicon set', () => {
    expect(BRAND_ASSETS.faviconIco).toBe('favicon.ico');
    expect(BRAND_ASSETS.faviconSvg).toBe('favicon.svg');
    expect(BRAND_ASSETS.appleTouchIcon).toBe('apple-touch-icon.png');
    expect(BRAND_ASSETS.favicon16).toBe('favicon-16x16.png');
    expect(BRAND_ASSETS.favicon32).toBe('favicon-32x32.png');
  });

  it('references optimized Easy Payments mark and lockup paths', () => {
    expect(BRAND_ASSETS.mark64).toBe('brand/mark-64.png');
    expect(BRAND_ASSETS.mark128).toBe('brand/mark-128.png');
    expect(BRAND_ASSETS.logoLockup).toBe('brand/logo-lockup-640.png');
    expect(BRAND_ASSETS.ogImage).toBe('og-image.png');
  });

  it('keeps all asset paths root-relative without leading slash', () => {
    for (const path of Object.values(BRAND_ASSETS)) {
      expect(path.startsWith('/')).toBe(false);
      expect(path.length).toBeGreaterThan(0);
    }
  });
});
