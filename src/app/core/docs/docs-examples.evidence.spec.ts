import { getDocsPage } from './docs.manifest';
import { DocsSearchService } from './docs-search.service';
import { TestBed } from '@angular/core/testing';

describe('documentation examples and navigation after W4.1', () => {
  it('uses version-pinned install commands and real package name', () => {
    for (const version of ['1.0.0', '1.1.0', '1.2.0', '1.2.1'] as const) {
      const install = getDocsPage('angular', version, 'installation')!;
      expect(install.markdown).toContain(
        `npm install @easy-payments/angular@${version} @stripe/stripe-js`,
      );
      expect(install.markdown).toContain('provideEasyPayments');
      expect(install.markdown).toContain('provideHttpClient');
    }
  });

  it('documents CheckoutOptions and backend URLs matching published types', () => {
    const config100 = getDocsPage('angular', '1.0.0', 'configuration')!;
    expect(config100.markdown).toContain("successBehavior?: 'confirmation' | 'event-only'");
    expect(config100.markdown).toContain('customer?: { email?: string; name?: string }');
    expect(config100.markdown).toContain('shipping?: { required?: boolean }');
    expect(config100.markdown).toContain('There is **no** `backend.baseUrl`');
    expect(config100.markdown).toContain('confirmPaymentUrl is optional/reserved');
  });

  it('keeps historical navigation and search over published content only', () => {
    const search = TestBed.configureTestingModule({}).inject(DocsSearchService);
    const hits = search.search('confirmPaymentUrl', { scope: 'all' });
    expect(hits.some((hit) => hit.version === '1.0.0')).toBe(true);
    // Published docs versions only (including 1.2.1 remapped guides).
    expect(
      hits.every((hit) =>
        ['1.0.0', '1.1.0', '1.2.0', '1.2.1'].includes(hit.version),
      ),
    ).toBe(true);

    const localization = search.search('Localization', {
      framework: 'angular',
      version: '1.0.0',
      scope: 'current',
    });
    expect(
      localization.every((hit) => hit.slug !== 'localization'),
    ).toBe(true);
  });
});
