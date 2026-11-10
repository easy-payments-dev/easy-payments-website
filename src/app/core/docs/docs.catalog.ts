import { Injectable, inject } from '@angular/core';
import { FRAMEWORKS, getFramework } from '../../data/frameworks';
import { SiteI18nService } from '../i18n/site-i18n.service';
import {
  DOCS_DEFAULT_SLUG,
  DOCS_VERSIONS,
  getDocsPage,
  getDocsVersionManifest,
  getLatestPublishedDocsVersion,
  listPublishedDocsVersions,
} from './docs.manifest';
import { localizeDocsPage, renderLocalizedDocsMarkdown } from './docs-locale';
import { docsPagePath, docsVersionPath } from './docs-url';
import { renderDocsMarkdown } from './markdown.renderer';
import {
  DocsFrameworkId,
  DocsNavGroup,
  DocsNavLink,
  DocsPageMeta,
  DocsResolvedPage,
  DocsSelectOption,
  DocsVersionManifest,
} from './docs.types';

/** English fallback for the 1.2.1 release note (matches docs.releaseNote.121). */
const RELEASE_NOTE_121_FALLBACK =
  'This release updates website links and package metadata. The same checkout guides from 1.2.0 still apply — Full Checkout, Buttons Only, and Headless are unchanged.';

@Injectable({ providedIn: 'root' })
export class DocsCatalog {
  private readonly i18n = inject(SiteI18nService);
  private readonly localizedPagesCache = new Map<
    string,
    readonly DocsPageMeta[]
  >();
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

    const language = this.i18n.language();
    const localizedPages = this.localizedPages(manifest);
    const index = manifest.pages.findIndex((entry) => entry.id === page.id);
    const localizedPage = localizedPages[index] ?? page;
    const previousPage = index > 0 ? localizedPages[index - 1] : null;
    const nextPage =
      index >= 0 && index < localizedPages.length - 1
        ? localizedPages[index + 1]
        : null;
    // Heading ids stay derived from English markdown so shared #fragments work.
    const rendered =
      language === 'en' || localizedPage === page
        ? renderDocsMarkdown(page.markdown)
        : renderLocalizedDocsMarkdown(page.markdown, localizedPage.markdown);

    return {
      framework,
      frameworkName: manifest.frameworkName,
      packageName: manifest.packageName,
      version,
      latestPublished: manifest.latestPublished,
      page: localizedPage,
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
      navGroups: this.buildLocalizedNavGroups(
        framework,
        version,
        localizedPages,
      ),
      toc: rendered.toc,
    };
  }

  /**
   * Pages of a version localized for the current site language (same order and
   * slugs/ids as the English manifest). Cached per framework/version/language.
   */
  localizedPages(manifest: DocsVersionManifest): readonly DocsPageMeta[] {
    const language = this.i18n.language();
    const key = `${manifest.framework}:${manifest.version}:${language}`;
    const cached = this.localizedPagesCache.get(key);
    if (cached) {
      return cached;
    }
    const releaseNoteBody = this.releaseNoteBody();
    const releaseNoteLabel = this.i18n.t('docs.releaseNote.121Label');
    const pages = manifest.pages.map((entry) =>
      localizeDocsPage(
        entry,
        manifest.version,
        language,
        releaseNoteBody,
        releaseNoteLabel,
      ),
    );
    this.localizedPagesCache.set(key, pages);
    return pages;
  }

  private releaseNoteBody(): string {
    const key = 'docs.releaseNote.121';
    const value = this.i18n.t(key);
    return value && value !== key ? value : RELEASE_NOTE_121_FALLBACK;
  }

  private buildLocalizedNavGroups(
    framework: DocsFrameworkId,
    version: string,
    pages: readonly DocsPageMeta[],
  ): DocsNavGroup[] {
    const groups = new Map<
      string,
      { id: string; title: string; items: DocsNavLink[] }
    >();
    for (const page of pages) {
      let group = groups.get(page.groupId);
      if (!group) {
        group = { id: page.groupId, title: page.groupTitle, items: [] };
        groups.set(page.groupId, group);
      }
      group.items.push({
        id: page.id,
        slug: page.slug,
        title: page.title,
        href: docsPagePath(framework, version, page.slug),
      });
    }
    return Array.from(groups.values());
  }

  frameworkOptions(): readonly DocsSelectOption[] {
    const available = this.i18n.t('status.available');
    const comingSoon = this.i18n.t('status.comingSoon');
    return FRAMEWORKS.map((framework) => {
      if (framework.status === 'coming-soon') {
        return {
          value: framework.id,
          label: `${framework.name} (${comingSoon})`,
          disabled: true,
        };
      }
      return {
        value: framework.id,
        label: `${framework.name} (${available})`,
      };
    });
  }

  versionOptions(framework: DocsFrameworkId): readonly DocsSelectOption[] {
    const meta = getFramework(framework);
    if (!meta) {
      return [];
    }

    const comingSoon = this.i18n.t('status.comingSoon');
    const releaseCandidate = this.i18n.t('status.releaseCandidate');

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
          label: `${version.version} (${releaseCandidate})`,
          disabled: true,
        };
      }
      return {
        value: version.version,
        label: `${version.version} (${comingSoon})`,
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
