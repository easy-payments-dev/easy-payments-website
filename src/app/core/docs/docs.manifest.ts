import { pages as angular100 } from '../../../content/docs/angular/1.0.0';
import { pages as angular110 } from '../../../content/docs/angular/1.1.0';
import { pages as angular120 } from '../../../content/docs/angular/1.2.0';
import { getFramework, getLatestPublishedAngularVersion } from '../../data/frameworks';
import { docsPagePath } from './docs-url';
import {
  DocsFrameworkId,
  DocsNavGroup,
  DocsPageMeta,
  DocsVersionManifest,
} from './docs.types';

const DEFAULT_SLUG = 'getting-started';

function buildNavGroups(
  framework: DocsFrameworkId,
  version: string,
  pages: readonly DocsPageMeta[],
): DocsNavGroup[] {
  const groups = new Map<string, DocsNavGroup>();

  for (const page of pages) {
    let group = groups.get(page.groupId);
    if (!group) {
      group = {
        id: page.groupId,
        title: page.groupTitle,
        items: [],
      };
      groups.set(page.groupId, group);
    }

    (group.items as DocsNavGroup['items'][number][]).push({
      id: page.id,
      slug: page.slug,
      title: page.title,
      href: docsPagePath(framework, version, page.slug),
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => {
      const pageA = pages.find((page) => page.id === a.id)!;
      const pageB = pages.find((page) => page.id === b.id)!;
      return pageA.order - pageB.order;
    }),
  }));
}

function buildVersionManifest(
  framework: DocsFrameworkId,
  frameworkName: string,
  packageName: string,
  version: string,
  pages: readonly DocsPageMeta[],
  latestPublished: boolean,
): DocsVersionManifest {
  const sorted = [...pages].sort((a, b) => a.order - b.order);
  return {
    framework,
    frameworkName,
    packageName,
    version,
    status: 'published',
    latestPublished,
    defaultSlug: DEFAULT_SLUG,
    pages: sorted,
    navGroups: buildNavGroups(framework, version, sorted),
  };
}

const angular = getFramework('angular');
const latest = getLatestPublishedAngularVersion();

/** Immutable published documentation catalogs only. */
export const DOCS_VERSIONS: readonly DocsVersionManifest[] = [
  buildVersionManifest(
    'angular',
    'Angular',
    angular?.packageName ?? '@easy-payments/angular',
    '1.0.0',
    angular100,
    latest === '1.0.0',
  ),
  buildVersionManifest(
    'angular',
    'Angular',
    angular?.packageName ?? '@easy-payments/angular',
    '1.1.0',
    angular110,
    latest === '1.1.0',
  ),
  buildVersionManifest(
    'angular',
    'Angular',
    angular?.packageName ?? '@easy-payments/angular',
    '1.2.0',
    angular120,
    latest === '1.2.0',
  ),
];

export function getLatestPublishedDocsVersion(
  framework: DocsFrameworkId = 'angular',
): string | null {
  if (framework !== 'angular') {
    return null;
  }
  return getLatestPublishedAngularVersion();
}

export function getDocsVersionManifest(
  framework: DocsFrameworkId,
  version: string,
): DocsVersionManifest | undefined {
  return DOCS_VERSIONS.find(
    (entry) => entry.framework === framework && entry.version === version,
  );
}

export function listPublishedDocsVersions(
  framework: DocsFrameworkId,
): readonly DocsVersionManifest[] {
  return DOCS_VERSIONS.filter((entry) => entry.framework === framework);
}

export function getDocsPage(
  framework: DocsFrameworkId,
  version: string,
  slug: string,
): DocsPageMeta | undefined {
  return getDocsVersionManifest(framework, version)?.pages.find(
    (page) => page.slug === slug || page.id === slug,
  );
}

export const DOCS_DEFAULT_SLUG = DEFAULT_SLUG;
