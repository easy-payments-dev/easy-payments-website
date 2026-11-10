import {
  DOCS_VERSIONS,
  getDocsPage,
  getDocsVersionManifest,
  getLatestPublishedDocsVersion,
  listPublishedDocsVersions,
} from './docs.manifest';

describe('docs manifest', () => {
  it('lists Angular 1.0.0, 1.1.0, 1.2.0, and 1.2.1 snapshots', () => {
    expect(DOCS_VERSIONS.map((entry) => entry.version).sort()).toEqual([
      '1.0.0',
      '1.1.0',
      '1.2.0',
      '1.2.1',
    ]);
    expect(DOCS_VERSIONS.every((entry) => entry.status === 'published')).toBe(
      true,
    );
  });

  it('marks 1.2.1 as the latest published Angular docs version', () => {
    expect(getLatestPublishedDocsVersion('angular')).toBe('1.2.1');
    expect(getDocsVersionManifest('angular', '1.2.1')?.latestPublished).toBe(
      true,
    );
    expect(getDocsVersionManifest('angular', '1.2.0')?.latestPublished).toBe(
      false,
    );
    expect(getDocsVersionManifest('angular', '1.1.0')?.latestPublished).toBe(
      false,
    );
    expect(getDocsVersionManifest('angular', '1.0.0')?.latestPublished).toBe(
      false,
    );
  });

  it('reuses 1.2.0 guides for 1.2.1 with version-pinned install commands', () => {
    const page = getDocsPage('angular', '1.2.1', 'getting-started');
    expect(page?.markdown).toContain('@easy-payments/angular` **1.2.1**');
    expect(page?.markdown).toContain('website links and package metadata');
    expect(page?.markdown).toContain('same checkout guides');
    expect(
      getDocsPage('angular', '1.2.1', 'installation')?.markdown,
    ).toContain('npm install @easy-payments/angular@1.2.1 @stripe/stripe-js');
    expect(getDocsPage('angular', '1.2.1', 'full-checkout')).toBeTruthy();
    expect(getDocsPage('angular', '1.2.1', 'buttons-only')).toBeTruthy();
    expect(getDocsPage('angular', '1.2.1', 'headless')).toBeTruthy();
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
    expect(getDocsPage('angular', '1.1.0', 'checkout-modes')?.markdown).toContain(
      'Unpublished',
    );
    expect(getDocsPage('angular', '1.1.0', 'quick-start')?.markdown).toContain(
      'enableMockMode',
    );
  });

  it('keeps 1.1.0 Buttons Only and Headless pages as historical Unpublished snapshots', () => {
    for (const slug of ['buttons-only', 'headless'] as const) {
      const page = getDocsPage('angular', '1.1.0', slug);
      if (page) {
        expect(page.markdown).toContain('Unpublished');
      }
    }
    expect(getDocsPage('angular', '1.1.0', 'checkout-modes')?.markdown).toContain(
      'Unpublished',
    );
  });

  it('exposes the 1.2.0 launch pages without Unpublished messaging on modes/quick-start', () => {
    for (const slug of [
      'full-checkout',
      'buttons-only',
      'headless',
      'checkout-modes',
      'quick-start',
      'api-reference',
    ]) {
      expect(getDocsPage('angular', '1.2.0', slug)).toBeTruthy();
    }
    expect(
      getDocsPage('angular', '1.2.0', 'checkout-modes')?.markdown,
    ).not.toContain('Unpublished');
    expect(
      getDocsPage('angular', '1.2.0', 'quick-start')?.markdown,
    ).not.toContain('Unpublished');
  });

  it('presents 1.2.0 checkout modes as three comparison cards instead of a table', () => {
    const markdown = getDocsPage('angular', '1.2.0', 'checkout-modes')!.markdown;
    expect(markdown).not.toMatch(/^\|/m);
    expect(markdown.match(/^::: mode-card$/gm)).toHaveLength(3);
    for (const heading of ['## Full Checkout', '## Buttons Only', '## Headless']) {
      expect(markdown).toContain(heading);
    }
    for (const demo of ['full', 'buttons', 'headless']) {
      expect(markdown).toContain(`[Try demo](/playground?demo=${demo})`);
    }
    for (const guide of ['full-checkout', 'buttons-only', 'headless']) {
      expect(markdown).toContain(`[View guide](./${guide})`);
    }
    expect(markdown.match(/\*\*When to use:\*\*/g)).toHaveLength(3);
    expect(markdown.match(/\*\*Who owns the UI:\*\*/g)).toHaveLength(3);
    expect(markdown.match(/\*\*Public API:\*\*/g)).toHaveLength(3);
  });

  it('exposes navigation groups for each published version', () => {
    for (const version of listPublishedDocsVersions('angular')) {
      expect(version.navGroups.length).toBeGreaterThan(0);
      expect(version.pages.length).toBeGreaterThan(10);
      expect(version.defaultSlug).toBe('getting-started');
    }
  });
});
