import { docsSeoPages, listSitemapPaths, STATIC_SEO_PAGES } from './site-routes.seo';

describe('site-routes SEO catalog', () => {
  it('lists unique published sitemap paths without unpublished docs', () => {
    const paths = listSitemapPaths();
    expect(paths).toContain('/');
    expect(paths).toContain('/frameworks');
    expect(paths).toContain('/security');
    expect(paths).toContain('/playground');
    expect(paths).toContain('/contact');
    expect(paths).toContain('/docs/angular/1.0.0/getting-started');
    expect(paths).toContain('/docs/angular/1.1.0/localization');
    expect(paths.some((path) => path.includes('1.2.0'))).toBe(false);
    expect(paths.some((path) => path.includes('/docs/react'))).toBe(false);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('builds unique docs titles and descriptions', () => {
    const pages = docsSeoPages();
    expect(pages.length).toBeGreaterThan(20);
    const titles = pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(
      pages.find((page) => page.path.includes('/1.1.0/getting-started'))?.title,
    ).toContain('latest published');
    expect(
      pages.find((page) => page.path.includes('/1.0.0/getting-started'))?.title,
    ).not.toContain('latest published');
  });

  it('keeps static marketing pages indexed', () => {
    for (const page of STATIC_SEO_PAGES) {
      expect(page.index === false).toBe(false);
      expect(page.description.length).toBeGreaterThan(40);
    }
  });
});
