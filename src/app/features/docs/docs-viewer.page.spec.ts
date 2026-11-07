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
    expect(router.url).toBe('/docs/angular/1.1.0/getting-started');
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

  it('shows an unpublished state for Angular 1.2.0', async () => {
    const fixture = TestBed.createComponent(
      (await import('./docs-viewer.page')).DocsViewerPage,
    );
    fixture.componentRef.setInput('framework', 'angular');
    fixture.componentRef.setInput('version', '1.2.0');
    fixture.componentRef.setInput('slug', 'getting-started');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Version not published',
    );
  });
});
