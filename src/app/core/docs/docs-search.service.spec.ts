import { TestBed } from '@angular/core/testing';
import { DocsSearchService } from './docs-search.service';

describe('DocsSearchService', () => {
  let service: DocsSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocsSearchService);
  });

  it('searches published documentation by title and content', () => {
    const titleHits = service.search('Localization', {
      scope: 'all',
    });
    expect(titleHits.some((hit) => hit.slug === 'localization')).toBe(true);
    expect(titleHits.every((hit) => hit.version !== '1.2.0')).toBe(true);

    const contentHits = service.search('enableMockMode', {
      framework: 'angular',
      version: '1.1.0',
      scope: 'current',
    });
    expect(contentHits.length).toBeGreaterThan(0);
    expect(contentHits[0].href).toContain('/docs/angular/1.1.0/');
  });

  it('returns an empty list for blank queries', () => {
    expect(service.search('   ')).toEqual([]);
  });
});
