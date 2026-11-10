import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let i18n: SiteI18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    i18n = TestBed.inject(SiteI18nService);
    i18n.setLanguage('en');
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
    expect(el.textContent).toContain('Payments Made Simple');
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
    expect(heroImages).toEqual(['screenshots/checkout-desktop-en.png']);
    expect(heroImages).not.toContain('brand/logo-lockup-640.png');
  });

  it('swaps the hero checkout preview image, caption, and alt with site language', () => {
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('.hero__media img') as HTMLImageElement;
    const caption = el.querySelector('.hero__media figcaption');

    expect(img.getAttribute('src')).toBe('screenshots/checkout-desktop-en.png');
    expect(img.getAttribute('alt')).toContain('Easy Payments Angular checkout');
    expect(caption?.textContent).toContain('demo mode, no live charges');

    i18n.setLanguage('es');
    fixture.detectChanges();
    expect(img.getAttribute('src')).toBe('screenshots/checkout-desktop-es.png');
    expect(img.getAttribute('alt')).toContain('Tarjeta');
    expect(caption?.textContent).toContain('modo demo, sin cargos reales');

    i18n.setLanguage('pt');
    fixture.detectChanges();
    expect(img.getAttribute('src')).toBe('screenshots/checkout-desktop-pt.png');
    expect(img.getAttribute('alt')).toContain('Cartão');
    expect(caption?.textContent).toContain('modo demo, sem cobranças reais');
  });

  it('presents Angular as available and other frameworks as coming soon', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Angular');
    expect(el.textContent).toContain('Available');
    expect(el.textContent).toContain('React');
    expect(el.textContent).toContain('Vue');
    expect(el.textContent).toContain('Svelte');
    expect(el.textContent).toContain('Coming soon');
    expect(el.textContent).toContain('v1.2.1');
    expect(el.textContent).toMatch(/Angular docs \(v1\.2\.1\)/);
  });

  it('switches hero, status labels, and section chrome when language changes', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#hero-title')?.textContent).toContain(
      'Multi-provider checkout',
    );
    expect(el.textContent).toContain('Get Started');
    expect(el.textContent).toContain('Coming soon');
    expect(el.textContent).toContain('Available with config');

    i18n.setLanguage('es');
    fixture.detectChanges();
    expect(el.querySelector('#hero-title')?.textContent).toContain(
      'Checkout multiproveedor',
    );
    expect(el.textContent).toContain('Empezar');
    expect(el.textContent).toContain('Próximamente');
    expect(el.textContent).toContain('Disponible con configuración');
    expect(el.textContent).toContain('Capturas reales del checkout');

    i18n.setLanguage('pt');
    fixture.detectChanges();
    expect(el.querySelector('#hero-title')?.textContent).toContain(
      'Checkout multiprovedor',
    );
    expect(el.textContent).toContain('Começar');
    expect(el.textContent).toContain('Em breve');
    expect(el.textContent).toContain('Disponível com configuração');
  });

  it('shows the install command and presents all three modes as available', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(
      'npm install @easy-payments/angular @stripe/stripe-js',
    );
    expect(el.textContent).toContain('Full Checkout');
    expect(el.textContent).toContain('Buttons Only');
    expect(el.textContent).toContain('Headless');
    expect(el.textContent).toContain('Available in Angular 1.2.1');
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
    expect(el.textContent).toContain('Real checkout screenshots');
    expect(el.textContent).toContain('Desktop');
    expect(el.textContent).toContain('Mobile');
  });

  it('localizes gallery images, labels, and open lightbox content with site language', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const galleryImgs = () =>
      Array.from(el.querySelectorAll('.shot-gallery img')).map((img) =>
        img.getAttribute('src'),
      );

    expect(galleryImgs()).toEqual([
      'screenshots/checkout-desktop-en.png',
      'screenshots/checkout-mobile-en.png',
      'screenshots/checkout-dark-en.png',
      'screenshots/checkout-light-en.png',
      'screenshots/checkout-methods-en.png',
    ]);

    const featured = el.querySelector(
      '.shot-card--featured',
    ) as HTMLButtonElement;
    featured.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialogImg = () =>
      el.querySelector('.ep-lightbox__image') as HTMLImageElement | null;
    expect(dialogImg()?.getAttribute('src')).toBe(
      'screenshots/checkout-desktop-en.png',
    );
    expect(el.querySelector('.ep-lightbox__caption')?.textContent).toContain(
      'Desktop',
    );
    expect(el.querySelector('.ep-lightbox__close')?.textContent?.trim()).toBe(
      'Close',
    );

    i18n.setLanguage('es');
    fixture.detectChanges();
    expect(galleryImgs()).toEqual([
      'screenshots/checkout-desktop-es.png',
      'screenshots/checkout-mobile-es.png',
      'screenshots/checkout-dark-es.png',
      'screenshots/checkout-light-es.png',
      'screenshots/checkout-methods-es.png',
    ]);
    expect(el.textContent).toContain('Capturas reales del checkout');
    expect(el.textContent).toContain('Escritorio');
    expect(dialogImg()?.getAttribute('src')).toBe(
      'screenshots/checkout-desktop-es.png',
    );
    expect(el.querySelector('.ep-lightbox__caption')?.textContent).toContain(
      'Escritorio',
    );
    expect(el.querySelector('.ep-lightbox__close')?.textContent?.trim()).toBe(
      'Cerrar',
    );

    i18n.setLanguage('pt');
    fixture.detectChanges();
    expect(dialogImg()?.getAttribute('src')).toBe(
      'screenshots/checkout-desktop-pt.png',
    );
    expect(el.querySelector('.ep-lightbox__close')?.textContent?.trim()).toBe(
      'Fechar',
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
