import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteI18nService } from './core/i18n/site-i18n.service';
import { SiteMessageKey } from './core/i18n/site-messages';
import { SiteFooter } from './core/layout/site-footer/site-footer';
import { SiteHeader } from './core/layout/site-header/site-header';
import { SeoRouterService } from './core/seo/seo-router.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly siteI18n = inject(SiteI18nService);
  /** Ensures route-level SEO metadata is applied for CSR and prerender. */
  private readonly seoRouter = inject(SeoRouterService);

  protected t(key: SiteMessageKey): string {
    return this.siteI18n.t(key);
  }

  ngOnInit(): void {
    this.themeService.init();
    this.siteI18n.init();
    void this.seoRouter;
  }

  ngOnDestroy(): void {
    this.themeService.destroy();
  }
}
