import { DOCS_VERSIONS } from '../docs/docs.manifest';
import { SeoPageMeta } from './seo.service';

const SITE = 'easy payments';

export const STATIC_SEO_PAGES: readonly SeoPageMeta[] = [
  {
    path: '/',
    title: `${SITE} | Payments Made Simple`,
    description:
      'easy payments — open-source multi-provider checkout libraries for Angular and more. Official documentation, branding, and a safe checkout playground.',
  },
  {
    path: '/frameworks',
    title: `Frameworks | ${SITE}`,
    description:
      'Framework availability for easy payments. Angular is published; React, Vue, and Svelte are coming soon.',
  },
  {
    path: '/security',
    title: `Security | ${SITE}`,
    description:
      'Security overview for easy payments: frontend-safe credentials, backend verification, and why the library is not a payment processor.',
  },
  {
    path: '/playground',
    title: `Playground | Angular checkout mock demo | ${SITE}`,
    description:
      'Interactive Angular checkout playground. Configure published package options, preview the real @easy-payments/angular component in mock mode, and copy integration code. Demonstration only — no payments are processed.',
    index: true,
  },
  {
    path: '/contact',
    title: `Contact | ${SITE}`,
    description:
      'Contact the easy payments maintainers: send a suggestion, report a problem, or ask a question. Do not include card numbers or other sensitive data.',
  },
] as const;

export function docsSeoPages(): SeoPageMeta[] {
  return DOCS_VERSIONS.flatMap((manifest) =>
    manifest.pages.map((page) => ({
      path: `/docs/${manifest.framework}/${manifest.version}/${page.slug}`,
      title: `${page.title} · Angular ${manifest.version}${
        manifest.latestPublished ? ' · latest published' : ''
      } | ${SITE}`,
      description: page.description,
      type: 'article' as const,
    })),
  );
}

/** Crawlable public URLs for sitemap generation (excludes unpublished docs). */
export function listSitemapPaths(): string[] {
  const staticPaths = STATIC_SEO_PAGES.filter((page) => page.index !== false).map(
    (page) => page.path,
  );
  const docsPaths = docsSeoPages().map((page) => page.path);
  return [...staticPaths, ...docsPaths];
}
