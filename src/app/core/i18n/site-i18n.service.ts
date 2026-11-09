import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  DEFAULT_SITE_LANGUAGE,
  SITE_LANGUAGE_STORAGE_KEY,
  SITE_LANGUAGES,
  SiteLanguage,
} from './site-locale';
import { SITE_MESSAGE_CATALOGS, SiteMessageKey } from './site-messages';

@Injectable({ providedIn: 'root' })
export class SiteI18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly languageSignal = signal<SiteLanguage>(DEFAULT_SITE_LANGUAGE);

  readonly language = this.languageSignal.asReadonly();
  readonly languages = SITE_LANGUAGES;
  readonly catalog = computed(() => SITE_MESSAGE_CATALOGS[this.languageSignal()]);

  init(): void {
    const initial = this.readStoredLanguage() ?? this.detectBrowserLanguage();
    this.applyLanguage(initial, false);
  }

  t(key: SiteMessageKey): string {
    return this.catalog()[key] ?? SITE_MESSAGE_CATALOGS.en[key] ?? key;
  }

  setLanguage(language: SiteLanguage): void {
    this.applyLanguage(language, true);
  }

  /** Maps site chrome language to checkout locale input (never `auto`). */
  checkoutLocale(): Exclude<SiteLanguage, never> {
    return this.languageSignal();
  }

  private applyLanguage(language: SiteLanguage, persist: boolean): void {
    this.languageSignal.set(language);
    this.document.documentElement.lang = language;
    if (persist) {
      this.persistLanguage(language);
    }
  }

  private detectBrowserLanguage(): SiteLanguage {
    if (!isPlatformBrowser(this.platformId) || typeof navigator === 'undefined') {
      return DEFAULT_SITE_LANGUAGE;
    }
    const candidates = [...(navigator.languages ?? []), navigator.language];
    for (const tag of candidates) {
      const normalized = tag?.toLowerCase() ?? '';
      if (normalized.startsWith('es')) {
        return 'es';
      }
      if (normalized.startsWith('pt')) {
        return 'pt';
      }
      if (normalized.startsWith('en')) {
        return 'en';
      }
    }
    return DEFAULT_SITE_LANGUAGE;
  }

  private readStoredLanguage(): SiteLanguage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const value = localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
      if (value === 'en' || value === 'es' || value === 'pt') {
        return value;
      }
    } catch {
      // Ignore storage failures.
    }
    return null;
  }

  private persistLanguage(language: SiteLanguage): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures.
    }
  }
}
