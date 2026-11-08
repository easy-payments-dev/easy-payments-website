export type SiteLanguage = 'en' | 'es' | 'pt';

export const SITE_LANGUAGES: readonly {
  code: SiteLanguage;
  label: string;
  nativeLabel: string;
}[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
] as const;

export const SITE_LANGUAGE_STORAGE_KEY = 'ep-site-language';

export const DEFAULT_SITE_LANGUAGE: SiteLanguage = 'en';
