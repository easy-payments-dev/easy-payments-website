import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ThemeService } from '../../theme/theme.service';
import { THEME_OPTIONS, ThemePreference } from '../../theme/theme.types';

interface NavItem {
  label: string;
  path?: string;
  externalUrl?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  private readonly themeService = inject(ThemeService);

  protected readonly siteName = environment.siteName;
  protected readonly githubUrl = environment.githubUrl;
  protected readonly themeOptions = THEME_OPTIONS;
  protected readonly themePreference = this.themeService.preference;
  protected readonly mobileOpen = signal(false);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Home', path: '/', exact: true },
    { label: 'Frameworks', path: '/frameworks' },
    { label: 'Documentation', path: '/docs/angular' },
    { label: 'Playground', path: '/playground' },
    { label: 'GitHub', externalUrl: environment.githubUrl },
  ];

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  protected onThemeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ThemePreference;
    this.themeService.setPreference(value);
  }
}
