import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './core/layout/site-footer/site-footer';
import { SiteHeader } from './core/layout/site-header/site-header';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    this.themeService.init();
  }

  ngOnDestroy(): void {
    this.themeService.destroy();
  }
}
