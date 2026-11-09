import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { DocsCatalog } from '../../core/docs/docs.catalog';
import { DocsSearchService } from '../../core/docs/docs-search.service';
import {
  DocsFrameworkId,
  DocsSearchHit,
  DocsTocHeading,
} from '../../core/docs/docs.types';
import { isDocsFrameworkId } from '../../core/docs/docs-url';
import { EpDocsMarkdown } from '../../shared/docs-ui/docs-markdown/docs-markdown';
import { EpDocsPageHeader } from '../../shared/docs-ui/docs-page-header/docs-page-header';
import { EpDocsPager } from '../../shared/docs-ui/docs-pager/docs-pager';
import { EpDocsShell } from '../../shared/docs-ui/docs-shell/docs-shell';
import {
  DocsNavGroup,
  EpDocsSidebar,
} from '../../shared/docs-ui/docs-sidebar/docs-sidebar';
import { DocsTocItem, EpDocsToc } from '../../shared/docs-ui/docs-toc/docs-toc';
import { EpDocsToolbar } from '../../shared/docs-ui/docs-toolbar/docs-toolbar';
import { EpBadge } from '../../shared/ui/badge/badge';
import { EpContainer } from '../../shared/ui/container/container';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { SupportProjectCard } from '../../shared/support/support-project-card';
import { DocsSearchDialog } from './docs-search-dialog';

@Component({
  selector: 'app-docs-viewer-page',
  imports: [
    RouterLink,
    EpContainer,
    EpDocsShell,
    EpDocsSidebar,
    EpDocsToolbar,
    EpDocsPageHeader,
    EpDocsToc,
    EpDocsPager,
    EpDocsMarkdown,
    EpBadge,
    SupportProjectCard,
    DocsSearchDialog,
  ],
  templateUrl: './docs-viewer.page.html',
  styleUrl: './docs-viewer.page.scss',
})
export class DocsViewerPage {
  private readonly catalog = inject(DocsCatalog);
  private readonly search = inject(DocsSearchService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(SiteI18nService);

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  /** Bound from route params via withComponentInputBinding. */
  readonly framework = input.required<string>();
  readonly version = input.required<string>();
  readonly slug = input.required<string>();

  protected readonly mobileNavOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly searchScope = signal<'current' | 'all'>('current');
  protected readonly activeTocId = signal<string | null>(null);
  protected readonly toc = signal<readonly DocsTocHeading[]>([]);

  protected readonly resolved = computed(() => {
    const framework = this.framework();
    const version = this.version();
    const slug = this.slug();
    if (!isDocsFrameworkId(framework)) {
      return null;
    }
    return this.catalog.resolvePage(framework, version, slug);
  });

  protected readonly missingReason = computed(() => {
    const framework = this.framework();
    if (!isDocsFrameworkId(framework)) {
      return 'unknown-framework';
    }
    if (framework !== 'angular') {
      return 'coming-soon';
    }
    const version = this.version();
    if (!this.catalog.getVersion(framework, version)) {
      return 'unknown-version';
    }
    if (!this.resolved()) {
      return 'unknown-page';
    }
    return null;
  });

  protected readonly frameworkOptions = this.catalog.frameworkOptions();

  protected readonly versionOptions = computed(() => {
    const framework = this.framework();
    if (!isDocsFrameworkId(framework)) {
      return [];
    }
    return this.catalog.versionOptions(framework);
  });

  protected readonly navGroups = computed<readonly DocsNavGroup[]>(() => {
    const page = this.resolved();
    if (!page) {
      return [];
    }
    return page.navGroups.map((group) => ({
      title: group.title,
      items: group.items.map((item) => ({
        id: item.id,
        label: item.title,
        href: item.href,
        active: item.slug === page.page.slug,
      })),
    }));
  });

  protected readonly tocItems = computed<readonly DocsTocItem[]>(() =>
    this.toc().map((item) => ({
      id: item.id,
      label: item.text,
      active: this.activeTocId() === item.id,
    })),
  );

  protected readonly searchHits = computed<readonly DocsSearchHit[]>(() => {
    const page = this.resolved();
    return this.search.search(this.searchQuery(), {
      scope: this.searchScope(),
      framework: page?.framework,
      version: page?.version,
    });
  });

  constructor() {
    effect(() => {
      const page = this.resolved();
      if (!page) {
        return;
      }
      this.title.setTitle(
        `${page.page.title} · Angular ${page.version} | easy payments`,
      );
    });

    effect(() => {
      if (this.searchOpen() && isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      } else if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = '';
      }
    });
  }

  protected onTocChange(items: readonly DocsTocHeading[]): void {
    this.toc.set(items);
    this.activeTocId.set(items[0]?.id ?? null);
  }

  protected onFrameworkChange(value: string): void {
    if (!isDocsFrameworkId(value) || value !== 'angular') {
      return;
    }
    const latest = this.catalog.getLatestPublishedVersion(value);
    if (!latest) {
      return;
    }
    void this.router.navigateByUrl(
      this.catalog.pathForVersionSwitch(value, latest, this.slug()),
    );
  }

  protected onVersionChange(value: string): void {
    const framework = this.framework();
    if (!isDocsFrameworkId(framework)) {
      return;
    }
    const options = this.catalog.versionOptions(framework);
    const allowed = options.find((option) => option.value === value);
    if (!allowed || allowed.disabled) {
      return;
    }
    void this.router.navigateByUrl(
      this.catalog.pathForVersionSwitch(framework, value, this.slug()),
    );
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    const isFind =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (isFind) {
      event.preventDefault();
      this.openSearch();
      return;
    }
    if (event.key === 'Escape' && this.mobileNavOpen() && !this.searchOpen()) {
      this.closeMobileNav();
    }
  }

  protected latestHref(framework: DocsFrameworkId = 'angular'): string {
    const latest = this.catalog.getLatestPublishedVersion(framework);
    return latest
      ? this.catalog.pathForVersionSwitch(framework, latest, null)
      : '/docs/angular';
  }
}
