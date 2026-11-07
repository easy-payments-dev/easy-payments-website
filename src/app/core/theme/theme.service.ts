import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ResolvedTheme,
  THEME_STORAGE_KEY,
  ThemePreference,
} from './theme.types';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mediaQuery =
    '(prefers-color-scheme: dark)';
  private media: MediaQueryList | null = null;

  private readonly preferenceSignal = signal<ThemePreference>('system');
  private readonly systemDarkSignal = signal(false);

  readonly preference = this.preferenceSignal.asReadonly();
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const preference = this.preferenceSignal();
    if (preference === 'system') {
      return this.systemDarkSignal() ? 'dark' : 'light';
    }
    return preference;
  });

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof window.matchMedia === 'function') {
      this.media = window.matchMedia(this.mediaQuery);
      this.systemDarkSignal.set(this.media.matches);
      this.media.addEventListener('change', this.onSystemChange);
    } else {
      this.systemDarkSignal.set(false);
    }

    const stored = this.readStoredPreference();
    this.preferenceSignal.set(stored);
    this.applyResolvedTheme();
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    this.persistPreference(preference);
    this.applyResolvedTheme();
  }

  destroy(): void {
    if (!isPlatformBrowser(this.platformId) || !this.media) {
      return;
    }
    this.media.removeEventListener('change', this.onSystemChange);
  }

  private readonly onSystemChange = (event: MediaQueryListEvent): void => {
    this.systemDarkSignal.set(event.matches);
    if (this.preferenceSignal() === 'system') {
      this.applyResolvedTheme();
    }
  };

  private applyResolvedTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    document.documentElement.dataset['theme'] = this.resolvedTheme();
    document.documentElement.style.colorScheme = this.resolvedTheme();
  }

  private readStoredPreference(): ThemePreference {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
      }
    } catch {
      // Ignore storage failures (private mode, blocked storage).
    }
    return 'system';
  }

  private persistPreference(preference: ThemePreference): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Ignore storage failures.
    }
  }
}
