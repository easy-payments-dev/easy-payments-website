import { Injectable } from '@angular/core';
import { FRAMEWORKS, getFramework } from '../../data/frameworks';
import {
  DOCS_DEFAULT_SLUG,
  DOCS_VERSIONS,
  getDocsPage,
  getDocsVersionManifest,
  getLatestPublishedDocsVersion,
  listPublishedDocsVersions,
} from './docs.manifest';
import { docsPagePath, docsVersionPath } from './docs-url';
import { renderDocsMarkdown } from './markdown.renderer';
import {
  DocsFrameworkId,
  DocsResolvedPage,
  DocsSelectOption,
  DocsVersionManifest,
} from './docs.types';

@Injectable({ providedIn: 'root' })
export class DocsCatalog {
  readonly defaultSlug = DOCS_DEFAULT_SLUG;

  getLatestPublishedVersion(framework: DocsFrameworkId): string | null {
    return getLatestPublishedDocsVersion(framework);
  }

  getVersion(
    framework: DocsFrameworkId,
    version: string,
  ): DocsVersionManifest | undefined {
    return getDocsVersionManifest(framework, version);
  }

  listPublishedVersions(framework: DocsFrameworkId): readonly DocsVersionManifest[] {
    return listPublishedDocsVersions(framework);
  }

  resolvePage(
    framework: DocsFrameworkId,
    version: string,
    slug: string,
  ): DocsResolvedPage | null {
    const manifest = this.getVersion(framework, version);
    const page = getDocsPage(framework, version, slug);
    if (!manifest || !page) {
      return null;
    }

    const index = manifest.pages.findIndex((entry) => entry.id === page.id);
    const previousPage = index > 0 ? manifest.pages[index - 1] : null;
    const nextPage =
      index >= 0 && index < manifest.pages.length - 1
        ? manifest.pages[index + 1]
        : null;
    const rendered = renderDocsMarkdown(page.markdown);

    return {
      framework,
      frameworkName: manifest.frameworkName,
      packageName: manifest.packageName,
      version,
      latestPublished: manifest.latestPublished,
      page,
      href: docsPagePath(framework, version, page.slug),
      previous: previousPage
        ? {
            id: previousPage.id,
            slug: previousPage.slug,
            title: previousPage.title,
            href: docsPagePath(framework, version, previousPage.slug),
          }
        : null,
      next: nextPage
        ? {
            id: nextPage.id,
            slug: nextPage.slug,
            title: nextPage.title,
            href: docsPagePath(framework, version, nextPage.slug),
          }
        : null,
      navGroups: manifest.navGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
        })),
      })),
      toc: rendered.toc,
    };
  }

  frameworkOptions(): readonly DocsSelectOption[] {
    return FRAMEWORKS.map((framework) => {
      if (framework.status === 'coming-soon') {
        return {
          value: framework.id,
          label: `${framework.name} (Coming Soon)`,
          disabled: true,
        };
      }
      return {
        value: framework.id,
        label: `${framework.name} (Available)`,
      };
    });
  }

  versionOptions(framework: DocsFrameworkId): readonly DocsSelectOption[] {
    const meta = getFramework(framework);
    if (!meta) {
      return [];
    }

    return meta.versions.map((version) => {
      if (version.status === 'published') {
        return {
          value: version.version,
          label: version.version,
        };
      }
      if (version.status === 'release-candidate') {
        return {
          value: version.version,
          label: `${version.version} (Release Candidate / Unpublished)`,
          disabled: true,
        };
      }
      return {
        value: version.version,
        label: `${version.version} (Coming Soon)`,
        disabled: true,
      };
    });
  }

  pathForVersionSwitch(
    framework: DocsFrameworkId,
    version: string,
    currentSlug: string | null,
  ): string {
    const manifest = this.getVersion(framework, version);
    if (!manifest) {
      return docsVersionPath(framework, version);
    }
    const hasPage = currentSlug
      ? manifest.pages.some((page) => page.slug === currentSlug)
      : false;
    const slug = hasPage && currentSlug ? currentSlug : manifest.defaultSlug;
    return docsPagePath(framework, version, slug);
  }

  allPublishedVersions(): readonly DocsVersionManifest[] {
    return DOCS_VERSIONS;
  }
}
