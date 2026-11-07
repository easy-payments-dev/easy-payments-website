import { FrameworkMeta } from './version.types';

/**
 * Framework and version catalog for the marketing site.
 * Latest published Angular remains 1.1.0 until npm 1.2.0 is published.
 */
export const FRAMEWORKS: readonly FrameworkMeta[] = [
  {
    id: 'angular',
    name: 'Angular',
    status: 'published',
    packageName: '@easy-payments/angular',
    latestPublished: '1.1.0',
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
        notes: 'Current latest published release',
      },
      {
        version: '1.2.0',
        status: 'release-candidate',
        notes: 'Release candidate — not yet published to npm',
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
