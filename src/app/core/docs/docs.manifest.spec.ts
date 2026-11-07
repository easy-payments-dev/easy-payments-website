import {
  DOCS_VERSIONS,
  getDocsPage,
  getDocsVersionManifest,
  getLatestPublishedDocsVersion,
  listPublishedDocsVersions,
} from './docs.manifest';

describe('docs manifest', () => {
  it('publishes immutable Angular 1.0.0 and 1.1.0 snapshots only', () => {
    expect(DOCS_VERSIONS.map((entry) => entry.version).sort()).toEqual([
      '1.0.0',
      '1.1.0',
    ]);
    expect(DOCS_VERSIONS.every((entry) => entry.status === 'published')).toBe(
      true,
    );
    expect(DOCS_VERSIONS.some((entry) => entry.version === '1.2.0')).toBe(
      false,
    );
  });

  it('marks 1.1.0 as the latest published Angular docs version', () => {
    expect(getLatestPublishedDocsVersion('angular')).toBe('1.1.0');
    expect(getDocsVersionManifest('angular', '1.1.0')?.latestPublished).toBe(
      true,
    );
    expect(getDocsVersionManifest('angular', '1.0.0')?.latestPublished).toBe(
      false,
    );
  });

  it('keeps independent page snapshots per version', () => {
    const v100 = getDocsPage('angular', '1.0.0', 'getting-started');
    const v110 = getDocsPage('angular', '1.1.0', 'getting-started');
    expect(v100?.markdown).toContain('@easy-payments/angular` **1.0.0**');
    expect(v110?.markdown).toContain('@easy-payments/angular` **1.1.0**');
    expect(v100?.markdown).toContain(
      'Verified against the published `@easy-payments/angular@1.0.0` npm tarball',
    );
    expect(v110?.markdown).toContain(
      'Verified against `@easy-payments/angular@1.1.0`',
    );
    expect(getDocsPage('angular', '1.0.0', 'localization')).toBeUndefined();
    expect(getDocsPage('angular', '1.1.0', 'localization')).toBeTruthy();
  });

  it('exposes navigation groups for each published version', () => {
    for (const version of listPublishedDocsVersions('angular')) {
      expect(version.navGroups.length).toBeGreaterThan(0);
      expect(version.pages.length).toBeGreaterThan(10);
      expect(version.defaultSlug).toBe('getting-started');
    }
  });
});
