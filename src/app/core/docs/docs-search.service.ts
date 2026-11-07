import { Injectable, inject } from '@angular/core';
import { DocsCatalog } from './docs.catalog';
import { renderDocsMarkdown } from './markdown.renderer';
import {
  DocsFrameworkId,
  DocsSearchHit,
  DocsVersionManifest,
} from './docs.types';

interface SearchRecord {
  framework: DocsFrameworkId;
  frameworkName: string;
  version: string;
  pageId: string;
  slug: string;
  title: string;
  href: string;
  headings: string[];
  body: string;
}

@Injectable({ providedIn: 'root' })
export class DocsSearchService {
  private readonly catalog = inject(DocsCatalog);
  private readonly records: readonly SearchRecord[];

  constructor() {
    this.records = this.catalog.allPublishedVersions().flatMap((version) =>
      this.indexVersion(version),
    );
  }

  search(
    query: string,
    options?: {
      framework?: DocsFrameworkId;
      version?: string;
      scope?: 'current' | 'all';
    },
  ): DocsSearchHit[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const scope = options?.scope ?? 'current';
    const candidates = this.records.filter((record) => {
      if (scope === 'all') {
        return true;
      }
      if (options?.framework && record.framework !== options.framework) {
        return false;
      }
      if (options?.version && record.version !== options.version) {
        return false;
      }
      return true;
    });

    const hits: DocsSearchHit[] = [];

    for (const record of candidates) {
      if (record.title.toLowerCase().includes(normalized)) {
        hits.push(this.toHit(record, 'title', record.title));
        continue;
      }

      const heading = record.headings.find((entry) =>
        entry.toLowerCase().includes(normalized),
      );
      if (heading) {
        hits.push(this.toHit(record, 'heading', heading));
        continue;
      }

      const bodyIndex = record.body.toLowerCase().indexOf(normalized);
      if (bodyIndex >= 0) {
        hits.push(
          this.toHit(record, 'content', this.excerpt(record.body, bodyIndex)),
        );
      }
    }

    return hits.slice(0, 40);
  }

  private indexVersion(version: DocsVersionManifest): SearchRecord[] {
    return version.pages.map((page) => {
      const rendered = renderDocsMarkdown(page.markdown);
      return {
        framework: version.framework,
        frameworkName: version.frameworkName,
        version: version.version,
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        href: version.navGroups
          .flatMap((group) => group.items)
          .find((item) => item.id === page.id)!.href,
        headings: rendered.headings,
        body: rendered.plainText,
      };
    });
  }

  private toHit(
    record: SearchRecord,
    matchKind: DocsSearchHit['matchKind'],
    excerpt: string,
  ): DocsSearchHit {
    return {
      framework: record.framework,
      frameworkName: record.frameworkName,
      version: record.version,
      pageId: record.pageId,
      slug: record.slug,
      title: record.title,
      href: record.href,
      excerpt,
      matchKind,
    };
  }

  private excerpt(body: string, index: number): string {
    const start = Math.max(0, index - 48);
    const end = Math.min(body.length, index + 96);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < body.length ? '…' : '';
    return `${prefix}${body.slice(start, end).trim()}${suffix}`;
  }
}
