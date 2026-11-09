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

  it('resolves 1.2.0 launch documentation', () => {
    expect(catalog.getVersion('angular', '1.2.0')).toBeDefined();
    expect(
      catalog.resolvePage('angular', '1.2.0', 'getting-started'),
    ).not.toBeNull();
    expect(catalog.getLatestPublishedVersion('angular')).toBe('1.2.0');
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
    expect(versions.find((item) => item.value === '1.2.0')?.disabled).toBeFalsy();
    expect(versions.find((item) => item.value === '1.1.0')?.disabled).toBeFalsy();
  });

  it('labels the 1.2.0 version option as plain 1.2.0', () => {
    const label = catalog
      .versionOptions('angular')
      .find((item) => item.value === '1.2.0')?.label;
    expect(label).toBe('1.2.0');
  });
});
