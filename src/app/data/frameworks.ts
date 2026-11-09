import { FrameworkMeta } from './version.types';

/**
 * Framework and version catalog for the marketing site.
 * Local launch-review preview presents 1.2.0 as the latest release.
 * npm publication remains a separate step after this review (site still
 * mounts the vendor/@easy-payments/angular@1.2.0 package).
 */
export const FRAMEWORKS: readonly FrameworkMeta[] = [
  {
    id: 'angular',
    name: 'Angular',
    status: 'published',
    packageName: '@easy-payments/angular',
    latestPublished: '1.2.0',
    docsPath: '/docs/angular',
    versions: [
      {
        version: '1.0.0',
        status: 'published',
        notes: 'Initial published release',
      },
      {
        version: '1.1.0',
        status: 'published',
        notes: 'Localization release',
      },
      {
        version: '1.2.0',
        status: 'published',
        notes: 'Full Checkout, Buttons Only, and Headless',
      },
    ],
  },
  {
    id: 'react',
    name: 'React',
    status: 'coming-soon',
    latestPublished: null,
    docsPath: null,
    versions: [],
  },
  {
    id: 'vue',
    name: 'Vue',
    status: 'coming-soon',
    latestPublished: null,
    docsPath: null,
    versions: [],
  },
  {
    id: 'svelte',
    name: 'Svelte',
    status: 'coming-soon',
    latestPublished: null,
    docsPath: null,
    versions: [],
  },
] as const;

export function getFramework(id: FrameworkMeta['id']): FrameworkMeta | undefined {
  return FRAMEWORKS.find((framework) => framework.id === id);
}

export function getLatestPublishedAngularVersion(): string {
  const angular = getFramework('angular');
  return angular?.latestPublished ?? '1.1.0';
}
