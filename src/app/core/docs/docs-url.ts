import { DocsFrameworkId } from './docs.types';

export function docsBasePath(framework: DocsFrameworkId): string {
  return `/docs/${framework}`;
}

export function docsVersionPath(
  framework: DocsFrameworkId,
  version: string,
): string {
  return `${docsBasePath(framework)}/${version}`;
}

export function docsPagePath(
  framework: DocsFrameworkId,
  version: string,
  slug: string,
): string {
  return `${docsVersionPath(framework, version)}/${slug}`;
}

export function isDocsFrameworkId(value: string): value is DocsFrameworkId {
  return (
    value === 'angular' ||
    value === 'react' ||
    value === 'vue' ||
    value === 'svelte'
  );
}
