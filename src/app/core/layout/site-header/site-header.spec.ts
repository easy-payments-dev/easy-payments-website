import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BRAND_ASSETS } from '../../brand/brand-assets';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  let fixture: ComponentFixture<SiteHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
  });

  it('renders the official lockup image instead of a reconstructed wordmark', () => {
    const el = fixture.nativeElement as HTMLElement;
    const lockup = el.querySelector('.brand__lockup') as HTMLImageElement;
    expect(lockup).toBeTruthy();
    expect(lockup.getAttribute('alt')).toBe('easy payments');
    expect(lockup.getAttribute('src')).toBe(BRAND_ASSETS.headerLockupLight);
    expect(el.querySelector('.brand__name')).toBeNull();
    expect(el.querySelector('.brand__tagline')).toBeNull();
  });

  it('exposes English, Español, and Português language controls', () => {
    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.lang-switcher__option')).map(
      (node) => node.textContent?.trim(),
    );
    expect(labels).toContain('English');
    expect(labels).toContain('Español');
    expect(labels).toContain('Português');
    expect(labels).not.toContain('Français');
  });
});
