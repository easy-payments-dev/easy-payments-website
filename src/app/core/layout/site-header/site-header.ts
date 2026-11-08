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
import { SiteI18nService } from '../../i18n/site-i18n.service';
import { SiteLanguage } from '../../i18n/site-locale';
import { SiteMessageKey } from '../../i18n/site-messages';
import { ThemeService } from '../../theme/theme.service';
import { THEME_OPTIONS, ThemePreference } from '../../theme/theme.types';

interface NavItem {
  labelKey: SiteMessageKey;
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
  private readonly i18n = inject(SiteI18nService);
  private readonly router = inject(Router);
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  protected readonly githubUrl = environment.githubUrl;
  protected readonly themeOptions = THEME_OPTIONS;
  protected readonly themePreference = this.themeService.preference;
  protected readonly resolvedTheme = this.themeService.resolvedTheme;
  protected readonly language = this.i18n.language;
  protected readonly languages = this.i18n.languages;
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

  private readonly navDefs: readonly NavItem[] = [
    { labelKey: 'nav.frameworks', path: '/frameworks' },
    { labelKey: 'nav.documentation', path: '/docs/angular' },
    { labelKey: 'nav.playground', path: '/playground' },
    { labelKey: 'nav.contact', path: '/contact' },
    { labelKey: 'nav.github', externalUrl: environment.githubUrl },
  ];

  protected readonly navItems = computed(() => {
    // Recompute labels when language changes.
    void this.language();
    return this.navDefs.map((item) => ({
      ...item,
      label: this.i18n.t(item.labelKey),
    }));
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMobile());
  }

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  protected themeLabel(preference: ThemePreference): string {
    switch (preference) {
      case 'light':
        return this.t('theme.light');
      case 'dark':
        return this.t('theme.dark');
      default:
        return this.t('theme.system');
    }
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

  protected setLanguage(language: SiteLanguage): void {
    this.i18n.setLanguage(language);
  }

  protected isLanguage(language: SiteLanguage): boolean {
    return this.language() === language;
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
