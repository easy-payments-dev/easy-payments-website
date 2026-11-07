import { marked, Renderer, Tokens } from 'marked';
import { DocsTocHeading } from './docs.types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_~>#|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MarkdownRenderResult {
  html: string;
  toc: DocsTocHeading[];
  plainText: string;
  headings: string[];
}

export interface MarkdownRenderOptions {
  /** Absolute docs base like /docs/angular/1.1.0 used to resolve ./slug links. */
  docsBasePath?: string;
}

/**
 * Controlled Markdown → HTML pipeline.
 * Output is intended for Angular [innerHTML] sanitization (no bypassSecurityTrustHtml).
 */
export function renderDocsMarkdown(
  markdown: string,
  options: MarkdownRenderOptions = {},
): MarkdownRenderResult {
  const toc: DocsTocHeading[] = [];
  const headings: string[] = [];
  const slugCounts = new Map<string, number>();

  const uniqueSlug = (raw: string): string => {
    const base = slugify(raw) || 'section';
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  const resolveHref = (href: string): string => {
    if (!href) {
      return href;
    }
    if (
      href.startsWith('#') ||
      href.startsWith('/') ||
      /^(https?:|mailto:)/i.test(href)
    ) {
      return href;
    }
    if (options.docsBasePath && /^\.\//.test(href)) {
      const slug = href.replace(/^\.\//, '').replace(/\.md$/i, '');
      return `${options.docsBasePath}/${slug}`;
    }
    return href;
  };

  const renderer = new Renderer();

  renderer.heading = ({ text, depth }: Tokens.Heading): string => {
    const plain = stripMarkdown(text);
    const id = uniqueSlug(plain);
    headings.push(plain);
    if (depth === 2 || depth === 3) {
      toc.push({ id, text: plain, level: depth });
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const safeHref = resolveHref(href ?? '');
    const isExternal = /^(https?:)?\/\//i.test(safeHref);
    const titleAttr = title ? ` title="${title}"` : '';
    const rel = isExternal ? ' rel="noopener noreferrer"' : '';
    const target = isExternal ? ' target="_blank"' : '';
    return `<a href="${safeHref}"${titleAttr}${rel}${target}>${text}</a>`;
  };

  renderer.html = (): string => {
    // Drop raw HTML from Markdown sources — content is authored as MD only.
    return '';
  };

  const html = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: false,
    renderer,
  }) as string;

  return {
    html,
    toc,
    plainText: stripMarkdown(markdown),
    headings,
  };
}
