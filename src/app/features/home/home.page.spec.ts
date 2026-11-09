import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the premium hero with brand and CTAs', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#hero-title')?.textContent).toContain(
      'Multi-provider checkout',
    );
    expect(el.textContent).toContain('PAYMENTS MADE SIMPLE');
    expect(el.textContent).toContain('Get Started');
    expect(el.textContent).toContain('GitHub');

    const hrefs = Array.from(el.querySelectorAll('a')).map((anchor) =>
      anchor.getAttribute('href'),
    );
    expect(hrefs.some((href) => href?.includes('/docs/angular'))).toBe(true);
    expect(hrefs).toContain(environment.githubUrl);
  });

  it('keeps the checkout screenshot and omits a redundant hero logo card', () => {
    const el = fixture.nativeElement as HTMLElement;
    const heroImages = Array.from(el.querySelectorAll('.hero img')).map((img) =>
      img.getAttribute('src'),
    );
    expect(el.querySelector('.hero__logo')).toBeNull();
    expect(heroImages).toEqual(['screenshots/checkout-desktop.png']);
    expect(heroImages).not.toContain('brand/logo-lockup-640.png');
  });

  it('presents Angular as available and other frameworks as coming soon', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Angular');
    expect(el.textContent).toContain('Available');
    expect(el.textContent).toContain('React');
    expect(el.textContent).toContain('Vue');
    expect(el.textContent).toContain('Svelte');
    expect(el.textContent).toContain('Coming soon');
    expect(el.textContent).toContain('v1.2.0');
    expect(el.textContent).toMatch(/Angular docs \(v1\.2\.0\)/);
  });

  it('shows the install command and presents all three modes as available in 1.2.0', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(
      'npm install @easy-payments/angular @stripe/stripe-js',
    );
    expect(el.textContent).toContain('Full Checkout');
    expect(el.textContent).toContain('Buttons Only');
    expect(el.textContent).toContain('Headless');
    expect(el.textContent).not.toContain('Coming in Angular v1.2.0');
    expect(el.textContent).not.toContain('Unpublished');
    expect(el.querySelectorAll('.experience-grid ep-badge').length).toBe(3);
    expect(el.textContent).toContain('Samsung Pay');
    expect(el.textContent).toContain('Not supported');
  });

  it('links documentation, playground, security, and repositories', () => {
    const el = fixture.nativeElement as HTMLElement;
    const hrefs = Array.from(el.querySelectorAll('a'))
      .map((anchor) => anchor.getAttribute('href'))
      .filter((href): href is string => !!href);

    expect(hrefs).toContain('/docs/angular');
    expect(hrefs).toContain('/playground');
    expect(hrefs).toContain('/security');
    expect(hrefs).toContain(environment.githubAngularUrl);
    expect(hrefs).toContain(environment.githubWebsiteUrl);
    expect(hrefs).toContain(environment.npmAngularUrl);
  });

  it('renders a compact screenshot gallery with featured and supporting previews', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.shot-gallery')).toBeTruthy();
    expect(el.querySelector('.shot-card--featured')).toBeTruthy();
    expect(el.querySelectorAll('.shot-gallery__thumbs .shot-card').length).toBe(
      4,
    );
  });

  it('opens and closes the screenshot lightbox', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const featured = el.querySelector(
      '.shot-card--featured',
    ) as HTMLButtonElement;
    featured.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');

    const close = el.querySelector('.ep-lightbox__close') as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });
});
