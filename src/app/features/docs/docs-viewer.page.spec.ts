import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';

describe('DocsViewerPage routing', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  it('redirects /docs/angular to the latest published getting-started page', async () => {
    await router.navigateByUrl('/docs/angular');
    expect(router.url).toBe('/docs/angular/1.2.1/getting-started');
  });

  it('keeps historical 1.0.0 and 1.2.0 pages independently accessible', async () => {
    await router.navigateByUrl('/docs/angular/1.0.0/installation');
    expect(router.url).toBe('/docs/angular/1.0.0/installation');
    await router.navigateByUrl('/docs/angular/1.2.0/getting-started');
    expect(router.url).toBe('/docs/angular/1.2.0/getting-started');
  });

  it('loads a published docs page shell with sidebar and article', async () => {
    await router.navigateByUrl('/docs/angular/1.1.0/security');
    const fixture = TestBed.createComponent(
      (await import('./docs-viewer.page')).DocsViewerPage,
    );
    // Bind route-like inputs directly for component assertions.
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.1.0');
    fixture.componentRef.setInput('slug', 'security');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Security');
    expect(el.querySelector('ep-docs-sidebar')).toBeTruthy();
    expect(el.querySelector('ep-docs-markdown')).toBeTruthy();
    expect(el.querySelector('.ep-md')).toBeTruthy();
  });

  it('resolves a real page for Angular 1.2.1', async () => {
    const fixture = TestBed.createComponent(
      (await import('./docs-viewer.page')).DocsViewerPage,
    );
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.1');
    fixture.componentRef.setInput('slug', 'getting-started');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Version not published');
    expect(el.textContent).not.toContain('Documentation page not found');
    expect(el.querySelector('ep-docs-markdown')).toBeTruthy();
    expect(el.textContent).toContain('1.2.1');
  });

  it('re-resolves localized content and keeps English toc ids on language switch', async () => {
    const { DocsViewerPage } = await import('./docs-viewer.page');
    const i18n = TestBed.inject(SiteI18nService);
    i18n.setLanguage('en');
    const fixture = TestBed.createComponent(DocsViewerPage);
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.1');
    fixture.componentRef.setInput('slug', 'installation');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const englishHrefs = Array.from(
      el.querySelectorAll('ep-docs-toc a[href^="#"]'),
    ).map((a) => a.getAttribute('href'));
    expect(englishHrefs.length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Installation');

    try {
      i18n.setLanguage('es');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.textContent).toContain('Instalación');
      const spanishHrefs = Array.from(
        el.querySelectorAll('ep-docs-toc a[href^="#"]'),
      ).map((a) => a.getAttribute('href'));
      expect(spanishHrefs).toEqual(englishHrefs);
    } finally {
      i18n.setLanguage('en');
    }
  });

  it('keeps the version selector, badge, and title in sync for 1.2.1', async () => {
    const { DocsViewerPage } = await import('./docs-viewer.page');
    const fixture = TestBed.createComponent(DocsViewerPage);
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.1');
    fixture.componentRef.setInput('slug', 'checkout-modes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toMatch(/latest published/i);
    const badge = el.querySelector('ep-docs-page-header ep-badge');
    expect(badge?.textContent?.trim()).toBe('1.2.1');
    const versionSelect = el.querySelector(
      'select[aria-label="Version selector"]',
    ) as HTMLSelectElement | null;
    expect(versionSelect?.value).toBe('1.2.1');
    expect(el.querySelector('.docs-mode-cards')).toBeTruthy();
    expect(el.querySelectorAll('.docs-mode-card')).toHaveLength(3);
    expect(document.title).toContain('Angular 1.2.1');
    expect(document.title).not.toMatch(/latest published/i);
  });
});
