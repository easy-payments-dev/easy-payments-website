import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BRAND_ASSETS } from '../../brand/brand-assets';
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
  private readonly router = inject(Router);
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  protected readonly githubUrl = environment.githubUrl;
  protected readonly themeOptions = THEME_OPTIONS;
  protected readonly themePreference = this.themeService.preference;
  protected readonly resolvedTheme = this.themeService.resolvedTheme;
  protected readonly mobileOpen = signal(false);

  protected readonly lockupSrc = computed(() =>
    this.resolvedTheme() === 'dark'
      ? BRAND_ASSETS.headerLockupDark
      : BRAND_ASSETS.headerLockupLight,
  );

  protected readonly lockupSrcset = computed(() =>
    this.resolvedTheme() === 'dark'
      ? `${BRAND_ASSETS.headerLockupDark} 1x, ${BRAND_ASSETS.headerLockupDark2x} 2x`
      : `${BRAND_ASSETS.headerLockupLight} 1x, ${BRAND_ASSETS.headerLockupLight2x} 2x`,
  );

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Frameworks', path: '/frameworks' },
    { label: 'Documentation', path: '/docs/angular' },
    { label: 'Playground', path: '/playground' },
    { label: 'GitHub', externalUrl: environment.githubUrl },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMobile());
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  protected setTheme(preference: ThemePreference): void {
    this.themeService.setPreference(preference);
  }

  protected isTheme(preference: ThemePreference): boolean {
    return this.themePreference() === preference;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.mobileOpen()) {
      return;
    }
    this.closeMobile();
    this.menuToggle()?.nativeElement.focus();
  }
}
