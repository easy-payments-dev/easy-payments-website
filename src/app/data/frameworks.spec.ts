import {
  FRAMEWORKS,
  getFramework,
  getLatestPublishedAngularVersion,
} from './frameworks';

describe('framework version metadata', () => {
  it('keeps Angular latest published at 1.1.0', () => {
    expect(getLatestPublishedAngularVersion()).toBe('1.1.0');
    expect(getFramework('angular')?.latestPublished).toBe('1.1.0');
  });

  it('marks Angular 1.2.0 as release candidate only', () => {
    const angular = getFramework('angular');
    const rc = angular?.versions.find((version) => version.version === '1.2.0');
    expect(rc?.status).toBe('release-candidate');
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
