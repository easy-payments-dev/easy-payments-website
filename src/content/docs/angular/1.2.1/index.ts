import { DocsPageMeta } from '../../../../app/core/docs/docs.types';
import { pages as angular120 } from '../1.2.0';

const SOURCE_VERSION = '1.2.0';
const TARGET_VERSION = '1.2.1';

const RELEASE_NOTE = `> **${TARGET_VERSION} notes:** This release updates website links and package metadata. The same checkout guides from ${SOURCE_VERSION} still apply — Full Checkout, Buttons Only, and Headless are unchanged.

`;

/**
 * Reuse the 1.2.0 guide set with version-pinned install commands and copy
 * rewritten for 1.2.1. Keeps one source of truth for checkout docs.
 */
function remapPage(page: DocsPageMeta): DocsPageMeta {
  const description = page.description.replaceAll(SOURCE_VERSION, TARGET_VERSION);
  let markdown = page.markdown.replaceAll(SOURCE_VERSION, TARGET_VERSION);

  if (page.slug === 'getting-started') {
    markdown = markdown.replace(
      /^(# Getting started\n\n)/,
      `$1${RELEASE_NOTE}`,
    );
  }

  return {
    ...page,
    description,
    markdown,
  };
}

export const pages: readonly DocsPageMeta[] = angular120.map(remapPage);
