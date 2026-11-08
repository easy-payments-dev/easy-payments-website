/**
 * Generates sitemap.xml and refreshes prerender-routes.txt from published docs only.
 * Run before production builds. Does not call network APIs.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = process.env.EP_SITE_URL || 'https://easypayments.dev';

function readDocsPages(version) {
  const dir = join(root, 'src', 'content', 'docs', 'angular', version);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.page.ts') && name !== 'index.ts')
    .map((name) => {
      const source = readFileSync(join(dir, name), 'utf8');
      const slugMatch = source.match(/"slug":\s*"([^"]+)"/);
      if (!slugMatch) {
        throw new Error(`Missing slug in ${name}`);
      }
      return slugMatch[1];
    })
    .sort();
}

const versions = ['1.0.0', '1.1.0'];
const staticPaths = ['/', '/frameworks', '/security', '/playground', '/contact'];
const docsPaths = versions.flatMap((version) =>
  readDocsPages(version).map((slug) => `/docs/angular/${version}/${slug}`),
);

const sitemapPaths = [...staticPaths, ...docsPaths];
const now = new Date().toISOString();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths
  .map((path) => {
    const loc = path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`;
    const priority =
      path === '/' ? '1.0' : path.startsWith('/docs/') ? '0.8' : '0.7';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

const prerenderRoutes = [
  '/',
  '/frameworks',
  '/security',
  ...docsPaths,
  // Playground intentionally omitted — client-rendered interactive simulation.
].join('\n');

const forbidden = ['1.2.0', '/docs/react', '/docs/vue', '/docs/svelte'];
for (const marker of forbidden) {
  if (sitemap.includes(marker) || prerenderRoutes.includes(marker)) {
    throw new Error(`SEO assets unexpectedly include unpublished route marker: ${marker}`);
  }
}

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'sitemap.xml'), `${sitemap}\n`, 'utf8');
writeFileSync(join(root, 'prerender-routes.txt'), `${prerenderRoutes}\n`, 'utf8');

console.log(
  `Generated sitemap.xml (${sitemapPaths.length} URLs) and prerender-routes.txt (${prerenderRoutes.split('\n').length} routes)`,
);
