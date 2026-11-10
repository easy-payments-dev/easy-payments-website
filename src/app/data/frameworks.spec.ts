import {
  FRAMEWORKS,
  getFramework,
  getLatestPublishedAngularVersion,
} from './frameworks';

describe('framework version metadata', () => {
  it('presents Angular 1.2.1 as the latest published version', () => {
    expect(getLatestPublishedAngularVersion()).toBe('1.2.1');
    expect(getFramework('angular')?.latestPublished).toBe('1.2.1');
  });

  it('lists Angular 1.0.0, 1.1.0, 1.2.0, and 1.2.1 as published versions', () => {
    const angular = getFramework('angular');
    expect(angular?.versions.map((version) => version.version)).toEqual([
      '1.0.0',
      '1.1.0',
      '1.2.0',
      '1.2.1',
    ]);
    expect(angular?.versions.every((version) => version.status === 'published')).toBe(
      true,
    );
  });

  it('lists React, Vue, and Svelte as coming soon', () => {
    for (const id of ['react', 'vue', 'svelte'] as const) {
      expect(getFramework(id)?.status).toBe('coming-soon');
    }
  });

  it('exposes four framework entries', () => {
    expect(FRAMEWORKS).toHaveLength(4);
  });

  it('uses the published Angular npm package name', () => {
    expect(getFramework('angular')?.packageName).toBe('@easy-payments/angular');
  });
});
