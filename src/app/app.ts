import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  /** Ensures route-level SEO metadata is applied for CSR and prerender. */
  private readonly seoRouter = inject(SeoRouterService);

  ngOnInit(): void {
    this.themeService.init();
    void this.seoRouter;
  }

  ngOnDestroy(): void {
    this.themeService.destroy();
  }
}
