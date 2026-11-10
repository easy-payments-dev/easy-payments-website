import { Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteI18nService } from '../i18n/site-i18n.service';
import { SiteMessageKey } from '../i18n/site-messages';
import { SeoService } from './seo.service';
import { STATIC_SEO_PAGES, docsSeoPages } from './site-routes.seo';

const PATH_TITLE_KEYS: Readonly<Record<string, SiteMessageKey>> = {
  '/': 'meta.title.home',
  '/frameworks': 'meta.title.frameworks',
  '/security': 'meta.title.security',
  '/playground': 'meta.title.playground',
  '/contact': 'meta.title.contact',
  '/faq': 'meta.title.faq',
  '/support': 'meta.title.support',
};

@Injectable({ providedIn: 'root' })
export class SeoRouterService {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(SiteI18nService);
  private readonly docsPages = docsSeoPages();
  private readonly currentPath = signal('/');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) =>
        this.currentPath.set(this.normalizePath(event.urlAfterRedirects)),
      );

    this.currentPath.set(this.normalizePath(this.router.url));

    effect(() => {
      void this.i18n.language();
      this.applyForUrl(this.currentPath());
    });
  }

  private applyForUrl(rawUrl: string): void {
    const path = this.normalizePath(rawUrl);
    const staticPage = STATIC_SEO_PAGES.find((page) => page.path === path);
    if (staticPage) {
      const titleKey = PATH_TITLE_KEYS[path];
      this.seo.apply({
        ...staticPage,
        title: titleKey ? this.i18n.t(titleKey) : staticPage.title,
      });
      return;
    }

    const docsPage = this.docsPages.find((page) => page.path === path);
    if (docsPage) {
      const match = path.match(/^\/docs\/[^/]+\/([^/]+)\/(.+)$/);
      const version = match?.[1] ?? '';
      const pageTitle = docsPage.title.split(' · ')[0] ?? docsPage.title;
      this.seo.apply({
        ...docsPage,
        title: this.i18n.t('meta.title.docsPage', {
          page: pageTitle,
          version,
        }),
      });
      return;
    }

    if (path.startsWith('/docs/')) {
      this.seo.apply({
        path,
        title: this.i18n.t('meta.title.docs'),
        description:
          'easy payments documentation for published Angular package versions.',
        index: false,
      });
      return;
    }

    this.seo.apply({
      path,
      title: this.i18n.t('meta.title.notFound'),
      description:
        'The requested easy payments page could not be found. Browse documentation, frameworks, or the checkout playground.',
      index: false,
    });
  }

  private normalizePath(url: string): string {
    const withoutQuery = url.split('?')[0]?.split('#')[0] ?? '/';
    if (!withoutQuery || withoutQuery === '/') {
      return '/';
    }
    return withoutQuery.endsWith('/')
      ? withoutQuery.slice(0, -1) || '/'
      : withoutQuery;
  }
}
