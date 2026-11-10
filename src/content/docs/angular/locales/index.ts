import { SiteLanguage } from '../../../../app/core/i18n/site-locale';
import { DocsLocaleBundle, DocsPageLocaleOverlay } from './types';
import { angular100Es } from './es/1.0.0';
import { angular110Es } from './es/1.1.0';
import { angular120Es } from './es/1.2.0';
import { angular100Pt } from './pt/1.0.0';
import { angular110Pt } from './pt/1.1.0';
import { angular120Pt } from './pt/1.2.0';

export type { DocsLocaleBundle, DocsPageLocaleOverlay } from './types';
export {
  angular100Es,
  angular110Es,
  angular120Es,
  angular100Pt,
  angular110Pt,
  angular120Pt,
};

/** Overlays keyed by non-English language, then by Angular docs version. */
const BUNDLES: Readonly<
  Partial<Record<SiteLanguage, Readonly<Record<string, DocsLocaleBundle>>>>
> = {
  es: {
    '1.0.0': angular100Es,
    '1.1.0': angular110Es,
    '1.2.0': angular120Es,
  },
  pt: {
    '1.0.0': angular100Pt,
    '1.1.0': angular110Pt,
    '1.2.0': angular120Pt,
  },
};

/** Versions that reuse another version's overlays (the page set is remapped). */
const VERSION_ALIASES: Readonly<Record<string, string>> = {
  '1.2.1': '1.2.0',
};

/**
 * Returns the localized overlay (title, description, groupTitle, markdown) for a
 * docs page, or `undefined` for English / when no translation exists.
 *
 * Note: overlay markdown keeps the `1.2.0` version token; callers that remap
 * 1.2.0 → 1.2.1 should apply the same replacement to the overlay text.
 */
export function getDocsLocaleOverlay(
  language: SiteLanguage,
  version: string,
  slug: string,
): DocsPageLocaleOverlay | undefined {
  if (language === 'en') {
    return undefined;
  }
  const resolvedVersion = VERSION_ALIASES[version] ?? version;
  return BUNDLES[language]?.[resolvedVersion]?.[slug];
}
