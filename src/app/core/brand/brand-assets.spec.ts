import { BRAND_ASSETS } from './brand-assets';

describe('BRAND_ASSETS', () => {
  it('references the official favicon set', () => {
    expect(BRAND_ASSETS.faviconIco).toBe('favicon.ico');
    expect(BRAND_ASSETS.faviconSvg).toBe('favicon.svg');
    expect(BRAND_ASSETS.appleTouchIcon).toBe('apple-touch-icon.png');
    expect(BRAND_ASSETS.favicon16).toBe('favicon-16x16.png');
    expect(BRAND_ASSETS.favicon32).toBe('favicon-32x32.png');
  });

  it('references official lockup derivatives for light and dark headers', () => {
    expect(BRAND_ASSETS.headerLockupLight).toBe('brand/header-lockup-light.png');
    expect(BRAND_ASSETS.headerLockupDark).toBe('brand/header-lockup-dark.png');
    expect(BRAND_ASSETS.headerLockupLight2x).toBe(
      'brand/header-lockup-light@2x.png',
    );
    expect(BRAND_ASSETS.headerLockupDark2x).toBe(
      'brand/header-lockup-dark@2x.png',
    );
  });

  it('keeps all asset paths root-relative without leading slash', () => {
    for (const path of Object.values(BRAND_ASSETS)) {
      expect(path.startsWith('/')).toBe(false);
      expect(path.length).toBeGreaterThan(0);
    }
  });
});
