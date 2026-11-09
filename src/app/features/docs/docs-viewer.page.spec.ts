import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';

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
    expect(router.url).toBe('/docs/angular/1.2.0/getting-started');
  });

  it('keeps historical 1.0.0 pages independently accessible', async () => {
    await router.navigateByUrl('/docs/angular/1.0.0/installation');
    expect(router.url).toBe('/docs/angular/1.0.0/installation');
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

  it('resolves a real page for Angular 1.2.0', async () => {
    const fixture = TestBed.createComponent(
      (await import('./docs-viewer.page')).DocsViewerPage,
    );
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.0');
    fixture.componentRef.setInput('slug', 'getting-started');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Version not published');
    expect(el.textContent).not.toContain('Documentation page not found');
    expect(el.querySelector('ep-docs-markdown')).toBeTruthy();
  });

  it('shows a plain 1.2.0 badge and title instead of "latest published"', async () => {
    const { DocsViewerPage } = await import('./docs-viewer.page');
    const fixture = TestBed.createComponent(DocsViewerPage);
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.0');
    fixture.componentRef.setInput('slug', 'checkout-modes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toMatch(/latest published/i);
    const badge = el.querySelector('ep-docs-page-header ep-badge');
    expect(badge?.textContent?.trim()).toBe('1.2.0');
    expect(el.querySelector('.docs-mode-cards')).toBeTruthy();
    expect(el.querySelectorAll('.docs-mode-card')).toHaveLength(3);
    expect(document.title).toContain('Angular 1.2.0');
    expect(document.title).not.toMatch(/latest published/i);
  });
});
