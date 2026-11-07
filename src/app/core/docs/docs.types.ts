export type DocsFrameworkId = 'angular' | 'react' | 'vue' | 'svelte';

export type DocsPublicationStatus =
  | 'published'
  | 'release-candidate'
  | 'coming-soon';

export interface DocsPageMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  groupId: string;
  groupTitle: string;
  order: number;
  /** Immutable markdown snapshot for this published version. */
  markdown: string;
}

export interface DocsNavLink {
  id: string;
  slug: string;
  title: string;
  href: string;
}

export interface DocsNavGroup {
  id: string;
  title: string;
  items: readonly DocsNavLink[];
}

export interface DocsVersionManifest {
  framework: DocsFrameworkId;
  frameworkName: string;
  packageName: string;
  version: string;
  status: DocsPublicationStatus;
  latestPublished: boolean;
  defaultSlug: string;
  pages: readonly DocsPageMeta[];
  navGroups: readonly DocsNavGroup[];
}

export interface DocsResolvedPage {
  framework: DocsFrameworkId;
  frameworkName: string;
  packageName: string;
  version: string;
  latestPublished: boolean;
  page: DocsPageMeta;
  href: string;
  previous: DocsNavLink | null;
  next: DocsNavLink | null;
  navGroups: readonly DocsNavGroup[];
  toc: readonly DocsTocHeading[];
}

export interface DocsTocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocsSearchHit {
  framework: DocsFrameworkId;
  frameworkName: string;
  version: string;
  pageId: string;
  slug: string;
  title: string;
  href: string;
  excerpt: string;
  matchKind: 'title' | 'heading' | 'content';
}

export interface DocsSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
