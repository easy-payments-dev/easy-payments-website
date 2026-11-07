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

  it('presents Angular as available and other frameworks as coming soon', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Angular');
    expect(el.textContent).toContain('Available');
    expect(el.textContent).toContain('React');
    expect(el.textContent).toContain('Vue');
    expect(el.textContent).toContain('Svelte');
    expect(el.textContent).toContain('Coming soon');
    expect(el.textContent).toContain('v1.1.0');
    expect(el.textContent).not.toMatch(/Angular docs \(v1\.2\.0\)/);
  });

  it('shows the published install command and labels 1.2.0 preview modes', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(
      'npm install @easy-payments/angular @stripe/stripe-js',
    );
    expect(el.textContent).toContain('Full Checkout');
    expect(el.textContent).toContain('Buttons Only');
    expect(el.textContent).toContain('Headless');
    expect(el.textContent).toContain('Coming in Angular v1.2.0');
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

  it('uses real checkout screenshot assets', () => {
    const el = fixture.nativeElement as HTMLElement;
    const images = Array.from(el.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );
    expect(images).toContain('screenshots/checkout-desktop.png');
    expect(images).toContain('screenshots/checkout-mobile.png');
    expect(images).toContain('screenshots/checkout-dark.png');
    expect(images).toContain('screenshots/checkout-methods.png');
  });
});
