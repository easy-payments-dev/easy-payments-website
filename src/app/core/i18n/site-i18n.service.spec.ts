import { TestBed } from '@angular/core/testing';
import { SiteI18nService } from './site-i18n.service';
import { SITE_LANGUAGE_STORAGE_KEY } from './site-locale';

describe('SiteI18nService', () => {
  beforeEach(() => {
    localStorage.removeItem(SITE_LANGUAGE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem(SITE_LANGUAGE_STORAGE_KEY);
  });

  it('defaults to English and exposes en/es/pt only', () => {
    const service = TestBed.inject(SiteI18nService);
    service.init();
    expect(service.language()).toBe('en');
    expect(service.languages.map((entry) => entry.code)).toEqual([
      'en',
      'es',
      'pt',
    ]);
    expect(service.t('nav.playground')).toBe('Playground');
  });

  it('persists language selection across service instances', () => {
    const first = TestBed.inject(SiteI18nService);
    first.init();
    first.setLanguage('es');
    expect(localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY)).toBe('es');
    expect(first.t('nav.documentation')).toBe('Documentación');
    expect(document.documentElement.lang).toBe('es');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const second = TestBed.inject(SiteI18nService);
    second.init();
    expect(second.language()).toBe('es');
    expect(second.checkoutLocale()).toBe('es');
  });

  it('never offers Français', () => {
    const service = TestBed.inject(SiteI18nService);
    expect(JSON.stringify(service.languages)).not.toContain('fr');
    expect(JSON.stringify(service.languages)).not.toContain('Français');
  });

  it('interpolates message params', () => {
    const service = TestBed.inject(SiteI18nService);
    service.init();
    expect(service.t('home.gallery.enlarge', { label: 'Desktop' })).toBe(
      'Enlarge screenshot: Desktop',
    );
    service.setLanguage('es');
    expect(service.t('home.gallery.enlarge', { label: 'Escritorio' })).toBe(
      'Ampliar captura: Escritorio',
    );
  });
});
