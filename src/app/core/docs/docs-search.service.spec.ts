import { TestBed } from '@angular/core/testing';
import { SiteI18nService } from '../i18n/site-i18n.service';
import { DocsSearchService } from './docs-search.service';

describe('DocsSearchService', () => {
  let service: DocsSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocsSearchService);
  });

  afterEach(() => {
    TestBed.inject(SiteI18nService).setLanguage('en');
  });

  it('searches published documentation by title and content', () => {
    const titleHits = service.search('Localization', {
      scope: 'all',
    });
    expect(titleHits.some((hit) => hit.slug === 'localization')).toBe(true);
    expect(titleHits.some((hit) => hit.version === '1.2.1')).toBe(true);
    expect(titleHits.some((hit) => hit.version === '1.2.0')).toBe(true);

    const contentHits = service.search('enableMockMode', {
      framework: 'angular',
      version: '1.1.0',
      scope: 'current',
    });
    expect(contentHits.length).toBeGreaterThan(0);
    expect(contentHits[0].href).toContain('/docs/angular/1.1.0/');
  });

  it('rebuilds the index with localized text when the language changes', () => {
    const i18n = TestBed.inject(SiteI18nService);
    i18n.setLanguage('en');
    expect(
      service.search('Instalación', { scope: 'all' }),
    ).toEqual([]);

    i18n.setLanguage('es');
    const hits = service.search('Instalación', { scope: 'all' });
    expect(hits.some((hit) => hit.slug === 'installation')).toBe(true);
    const hit = hits.find((entry) => entry.slug === 'installation')!;
    expect(hit.title).toBe('Instalación');
    // hrefs/slugs stay English.
    expect(hit.href).toMatch(/\/docs\/angular\/[\d.]+\/installation$/);

    i18n.setLanguage('en');
    expect(
      service.search('Instalación', { scope: 'all' }),
    ).toEqual([]);
    expect(
      service
        .search('Installation', { scope: 'all' })
        .some((entry) => entry.title === 'Installation'),
    ).toBe(true);
  });

  it('returns an empty list for blank queries', () => {
    expect(service.search('   ')).toEqual([]);
  });
});
