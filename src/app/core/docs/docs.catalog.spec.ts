import { TestBed } from '@angular/core/testing';
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

  it('does not resolve unpublished 1.2.0 documentation', () => {
    expect(catalog.getVersion('angular', '1.2.0')).toBeUndefined();
    expect(
      catalog.resolvePage('angular', '1.2.0', 'getting-started'),
    ).toBeNull();
  });

  it('preserves the current slug when switching versions when possible', () => {
    expect(
      catalog.pathForVersionSwitch('angular', '1.0.0', 'security'),
    ).toBe('/docs/angular/1.0.0/security');
    expect(
      catalog.pathForVersionSwitch('angular', '1.0.0', 'localization'),
    ).toBe('/docs/angular/1.0.0/getting-started');
  });

  it('disables coming soon frameworks and unpublished versions in selectors', () => {
    const frameworks = catalog.frameworkOptions();
    expect(frameworks.find((item) => item.value === 'react')?.disabled).toBe(
      true,
    );
    const versions = catalog.versionOptions('angular');
    expect(versions.find((item) => item.value === '1.2.0')?.disabled).toBe(
      true,
    );
    expect(versions.find((item) => item.value === '1.1.0')?.disabled).toBeFalsy();
  });
});
