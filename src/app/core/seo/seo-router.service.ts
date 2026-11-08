import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SeoService } from './seo.service';
import { STATIC_SEO_PAGES, docsSeoPages } from './site-routes.seo';

@Injectable({ providedIn: 'root' })
export class SeoRouterService {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly docsPages = docsSeoPages();

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.applyForUrl(event.urlAfterRedirects));

    this.applyForUrl(this.router.url);
  }

  private applyForUrl(rawUrl: string): void {
    const path = this.normalizePath(rawUrl);
    const staticPage = STATIC_SEO_PAGES.find((page) => page.path === path);
    if (staticPage) {
      this.seo.apply(staticPage);
      return;
    }

    const docsPage = this.docsPages.find((page) => page.path === path);
    if (docsPage) {
      this.seo.apply(docsPage);
      return;
    }

    if (path === '/playground') {
      const playground = STATIC_SEO_PAGES.find((page) => page.path === '/playground');
      if (playground) {
        this.seo.apply(playground);
      }
      return;
    }

    this.seo.apply({
      path,
      title: 'Not Found | easy payments',
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
