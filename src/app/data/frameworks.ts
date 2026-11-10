import { FrameworkMeta } from './version.types';

/**
 * Framework and version catalog for the marketing site.
 * Latest published docs default to 1.2.1 (website/package metadata bump;
 * checkout guides reuse the 1.2.0 set).
 */
export const FRAMEWORKS: readonly FrameworkMeta[] = [
  {
    id: 'angular',
    name: 'Angular',
    status: 'published',
    packageName: '@easy-payments/angular',
    latestPublished: '1.2.1',
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
      {
        version: '1.2.1',
        status: 'published',
        notes: 'Website links and package metadata; same checkout guides as 1.2.0',
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
