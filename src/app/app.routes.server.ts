import { RenderMode, ServerRoute } from '@angular/ssr';
import { DOCS_VERSIONS } from './core/docs/docs.manifest';

/**
 * Cloudflare Pages–compatible static prerender map.
 * Playground stays client-rendered (interactive simulation only).
 * Redirect-only and catch-all routes stay client-side.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'frameworks', renderMode: RenderMode.Prerender },
  { path: 'security', renderMode: RenderMode.Prerender },
  {
    path: 'docs/:framework/:version/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return DOCS_VERSIONS.flatMap((manifest) =>
        manifest.pages.map((page) => ({
          framework: manifest.framework,
          version: manifest.version,
          slug: page.slug,
        })),
      );
    },
  },
  { path: 'playground', renderMode: RenderMode.Client },
  { path: 'docs', renderMode: RenderMode.Client },
  { path: 'docs/angular', renderMode: RenderMode.Client },
  { path: 'docs/angular/:version', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
