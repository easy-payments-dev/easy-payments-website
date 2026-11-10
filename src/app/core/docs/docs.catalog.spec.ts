import { TestBed } from '@angular/core/testing';
import { SiteI18nService } from '../i18n/site-i18n.service';
import { DocsCatalog } from './docs.catalog';

describe('DocsCatalog', () => {
  let catalog: DocsCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    catalog = TestBed.inject(DocsCatalog);
  });

  it('resolves published pages and prev/next links', () => {
    const page = catalog.resolvePage('angular', '1.1.0', 'installation');
    expect(page?.page.title).toBe('Installation');
    expect(page?.previous?.slug).toBe('getting-started');
    expect(page?.next?.slug).toBe('quick-start');
    expect(page?.href).toBe('/docs/angular/1.1.0/installation');
  });

  it('resolves 1.2.1 as the latest documentation set', () => {
    expect(catalog.getVersion('angular', '1.2.1')).toBeDefined();
    expect(
      catalog.resolvePage('angular', '1.2.1', 'getting-started'),
    ).not.toBeNull();
    expect(catalog.getLatestPublishedVersion('angular')).toBe('1.2.1');
    expect(catalog.getVersion('angular', '1.2.0')).toBeDefined();
  });

  it('preserves the current slug when switching versions when possible', () => {
    expect(
      catalog.pathForVersionSwitch('angular', '1.0.0', 'security'),
    ).toBe('/docs/angular/1.0.0/security');
    expect(
      catalog.pathForVersionSwitch('angular', '1.0.0', 'localization'),
    ).toBe('/docs/angular/1.0.0/getting-started');
    expect(
      catalog.pathForVersionSwitch('angular', '1.2.1', 'headless'),
    ).toBe('/docs/angular/1.2.1/headless');
  });

  it('disables coming soon frameworks and unpublished versions in selectors', () => {
    const frameworks = catalog.frameworkOptions();
    expect(frameworks.find((item) => item.value === 'react')?.disabled).toBe(
      true,
    );
    const versions = catalog.versionOptions('angular');
    expect(versions.find((item) => item.value === '1.2.1')?.disabled).toBeFalsy();
    expect(versions.find((item) => item.value === '1.2.0')?.disabled).toBeFalsy();
    expect(versions.find((item) => item.value === '1.1.0')?.disabled).toBeFalsy();
  });

  describe('localization', () => {
    afterEach(() => {
      TestBed.inject(SiteI18nService).setLanguage('en');
    });

    it('keeps English pages, sidebar, and toc unchanged for en', () => {
      TestBed.inject(SiteI18nService).setLanguage('en');
      const page = catalog.resolvePage('angular', '1.2.1', 'getting-started');
      expect(page?.page.title).toBe('Getting started');
      expect(page?.page.markdown).toContain('**1.2.1 notes:**');
      expect(page?.navGroups[0].items[0].title).toBe('Getting started');
    });

    it('localizes page, prev/next, sidebar, and toc text while keeping English heading ids', () => {
      const i18n = TestBed.inject(SiteI18nService);
      i18n.setLanguage('en');
      const english = catalog.resolvePage('angular', '1.2.1', 'installation')!;

      i18n.setLanguage('es');
      const spanish = catalog.resolvePage('angular', '1.2.1', 'installation')!;

      expect(spanish.page.title).toBe('Instalación');
      expect(spanish.page.slug).toBe('installation');
      expect(spanish.href).toBe(english.href);
      expect(spanish.previous?.title).toBe('Primeros pasos');
      expect(spanish.previous?.href).toBe(english.previous?.href);
      expect(spanish.next?.title).toBe('Inicio rápido');
      expect(spanish.navGroups[0].title).toBe('Primeros pasos');
      expect(
        spanish.navGroups.flatMap((group) => group.items).map((i) => i.href),
      ).toEqual(
        english.navGroups.flatMap((group) => group.items).map((i) => i.href),
      );
      expect(spanish.navGroups[0].items[0].title).toBe('Primeros pasos');

      expect(spanish.toc.map((item) => item.id)).toEqual(
        english.toc.map((item) => item.id),
      );
      expect(spanish.toc.map((item) => item.text)).not.toEqual(
        english.toc.map((item) => item.text),
      );
    });

    it('inserts the localized 1.2.1 release note and remaps versions', () => {
      const i18n = TestBed.inject(SiteI18nService);
      i18n.setLanguage('pt');
      const page = catalog.resolvePage('angular', '1.2.1', 'getting-started')!;
      expect(page.page.markdown).toContain(i18n.t('docs.releaseNote.121'));
      expect(page.page.markdown).toContain('1.2.1');
      expect(page.page.description).not.toContain('1.2.0');
    });
  });

  it('labels the 1.2.1 version option as plain 1.2.1', () => {
    const label = catalog
      .versionOptions('angular')
      .find((item) => item.value === '1.2.1')?.label;
    expect(label).toBe('1.2.1');
  });
});
