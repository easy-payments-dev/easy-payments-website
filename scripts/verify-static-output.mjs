/**
 * Post-build static output checks for Cloudflare Pages readiness.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const browser = join(root, 'dist', 'easy-payments-website', 'browser');
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

assert(existsSync(browser), `Missing browser output: ${browser}`);

const requiredFiles = [
  'index.html',
  'sitemap.xml',
  'robots.txt',
  '_headers',
  '_redirects',
  'site.webmanifest',
  'favicon.ico',
  'og-image.png',
  'frameworks/index.html',
  'security/index.html',
  'docs/angular/1.0.0/getting-started/index.html',
  'docs/angular/1.1.0/getting-started/index.html',
  'docs/angular/1.1.0/localization/index.html',
];

for (const relative of requiredFiles) {
  assert(existsSync(join(browser, relative)), `Missing ${relative}`);
}

assert(
  !existsSync(join(browser, 'playground', 'index.html')),
  'Playground must remain client-rendered (no prerendered playground/index.html)',
);
assert(
  !existsSync(join(browser, 'docs', 'angular', '1.2.0')),
  'Unpublished Angular 1.2.0 docs must not appear in static output',
);

const sitemap = readFileSync(join(browser, 'sitemap.xml'), 'utf8');
assert(sitemap.includes('/docs/angular/1.1.0/getting-started'), 'Sitemap missing 1.1.0 getting-started');
assert(sitemap.includes('/docs/angular/1.0.0/getting-started'), 'Sitemap missing 1.0.0 getting-started');
assert(sitemap.includes('/playground'), 'Sitemap missing playground');
assert(!sitemap.includes('1.2.0'), 'Sitemap must not include Angular 1.2.0');
assert(!sitemap.includes('/docs/react'), 'Sitemap must not include React docs');
assert(!/<\/url>\s*<url>/g.test(sitemap) || sitemap.includes('<url>'), 'Sitemap malformed');

const robots = readFileSync(join(browser, 'robots.txt'), 'utf8');
assert(robots.includes('Sitemap:'), 'robots.txt missing Sitemap');
assert(robots.includes('Disallow: /docs/angular/1.2.0'), 'robots.txt missing 1.2.0 disallow');

const frameworksHtml = readFileSync(join(browser, 'frameworks', 'index.html'), 'utf8');
assert(frameworksHtml.includes('<title>Frameworks | easy payments</title>'), 'Frameworks title missing');
assert(
  !frameworksHtml.includes('localhost') &&
    frameworksHtml.includes('rel="canonical"') &&
    frameworksHtml.includes('https://easypayments.dev/frameworks'),
  'Frameworks canonical missing or incorrect (expected production https://easypayments.dev)',
);
assert(
  frameworksHtml.includes('property="og:url" content="https://easypayments.dev/frameworks"'),
  'Frameworks og:url missing or not production canonical',
);

const docsHtml = readFileSync(
  join(browser, 'docs', 'angular', '1.1.0', 'getting-started', 'index.html'),
  'utf8',
);
assert(docsHtml.includes('Getting started'), 'Docs content title missing from prerender');
assert(
  docsHtml.includes('property="og:type" content="article"'),
  'Docs og:type should be article',
);
assert(!docsHtml.includes('/docs/angular/1.2.0'), 'Docs prerender must not advertise 1.2.0 paths');

const headers = readFileSync(join(browser, '_headers'), 'utf8');
assert(headers.includes('Content-Security-Policy'), '_headers missing CSP');
assert(headers.includes('X-Frame-Options: DENY'), '_headers missing frame deny');

const redirects = readFileSync(join(browser, '_redirects'), 'utf8');
assert(redirects.includes('/docs/angular/1.1.0/getting-started'), '_redirects missing docs redirect');

function countHtmlFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countHtmlFiles(full);
    } else if (entry.name === 'index.html') {
      count += 1;
    }
  }
  return count;
}

const htmlCount = countHtmlFiles(browser);
assert(htmlCount >= 40, `Expected >= 40 prerendered HTML files, found ${htmlCount}`);

const mainJs = readdirSync(browser).find((name) => /^main-.*\.js$/.test(name));
assert(!!mainJs, 'Missing hashed main bundle');
if (mainJs) {
  const sizeKb = Math.round(statSync(join(browser, mainJs)).size / 1024);
  console.log(`main bundle: ${mainJs} (${sizeKb} KB)`);
}

if (failures.length) {
  console.error('Static verification failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`Static verification passed (${htmlCount} index.html files).`);
