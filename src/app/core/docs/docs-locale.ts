import { getDocsLocaleOverlay } from '../../../content/docs/angular/locales';
import { SiteLanguage } from '../i18n/site-locale';
import { DocsPageMeta, DocsTocHeading } from './docs.types';
import { renderDocsMarkdown } from './markdown.renderer';

const SOURCE_VERSION = '1.2.0';
const TARGET_VERSION = '1.2.1';

/**
 * Apply a locale overlay onto an English docs page.
 * For 1.2.1, overlays are authored against 1.2.0 and remapped here (including
 * a localized release note under the H1 on getting-started).
 */
export function localizeDocsPage(
  page: DocsPageMeta,
  version: string,
  language: SiteLanguage,
  releaseNoteBody?: string,
  releaseNoteLabel = `${TARGET_VERSION} notes:`,
): DocsPageMeta {
  if (language === 'en') {
    return page;
  }

  const overlay = getDocsLocaleOverlay(language, version, page.slug);
  if (!overlay) {
    return page;
  }

  let localized: DocsPageMeta = {
    ...page,
    title: overlay.title,
    description: overlay.description,
    groupTitle: overlay.groupTitle,
    markdown: overlay.markdown,
  };

  if (version === TARGET_VERSION) {
    localized = remapLocalizedTo121(
      localized,
      releaseNoteBody,
      releaseNoteLabel,
    );
  }

  return localized;
}

/**
 * Render localized markdown while keeping English-derived heading ids so
 * shared `#fragment` links stay stable across languages.
 */
export function renderLocalizedDocsMarkdown(
  englishMarkdown: string,
  localizedMarkdown: string,
  docsBasePath?: string,
): { html: string; toc: DocsTocHeading[]; plainText: string; headings: string[] } {
  const english = renderDocsMarkdown(englishMarkdown, { docsBasePath });
  const localized = renderDocsMarkdown(localizedMarkdown, { docsBasePath });
  const toc = localized.toc.map((item, index) => ({
    ...item,
    id: english.toc[index]?.id ?? item.id,
  }));
  return {
    html: localized.html,
    toc,
    plainText: localized.plainText,
    headings: localized.headings,
  };
}

function remapLocalizedTo121(
  page: DocsPageMeta,
  releaseNoteBody?: string,
  releaseNoteLabel = `${TARGET_VERSION} notes:`,
): DocsPageMeta {
  const description = page.description.replaceAll(SOURCE_VERSION, TARGET_VERSION);
  let markdown = page.markdown.replaceAll(SOURCE_VERSION, TARGET_VERSION);

  if (page.slug === 'getting-started' && releaseNoteBody) {
    // Match the first ATX H1 + blank line regardless of translated title text.
    markdown = markdown.replace(
      /^(# [^\n]+\n\n)/,
      `$1> **${releaseNoteLabel}** ${releaseNoteBody}\n\n`,
    );
  }

  return {
    ...page,
    description,
    markdown,
  };
}
