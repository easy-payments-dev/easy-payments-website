export interface DocsPageLocaleOverlay {
  title: string;
  description: string;
  groupTitle: string;
  markdown: string;
}

/** Locale overlays keyed by page slug (same slug as the English page). */
export type DocsLocaleBundle = Readonly<Record<string, DocsPageLocaleOverlay>>;
