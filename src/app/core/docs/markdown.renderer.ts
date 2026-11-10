import {
  Marked,
  Renderer,
  Tokens,
  type TokenizerAndRendererExtension,
} from 'marked';
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
    .replace(/^:::.*$/gm, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_~>#|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CONTAINER_OPEN = /^:::[ \t]*(mode-cards|mode-card)[ \t]*(?:\n|$)/;
const CONTAINER_NESTED_OPEN = /^:::[ \t]*[a-z][a-z-]*$/;

/**
 * Minimal docs layout convention (no raw HTML in Markdown sources):
 *
 *   ::: mode-cards
 *   ::: mode-card
 *   ## Title
 *   - body…
 *   :::
 *   :::
 *
 * mode-cards renders a responsive grid wrapper and mode-card a card. Their
 * contents are ordinary Markdown. Styles live in the docs-markdown component.
 */
const docsContainerExtension: TokenizerAndRendererExtension = {
  name: 'docsContainer',
  level: 'block',
  start(src: string): number | undefined {
    return src.match(/^:::[ \t]*mode-card/m)?.index;
  },
  tokenizer(src: string) {
    const open = CONTAINER_OPEN.exec(src);
    if (!open) {
      return undefined;
    }
    const lines = src.slice(open[0].length).split('\n');
    const body: string[] = [];
    let depth = 1;
    let consumed = open[0].length;
    let closed = false;
    for (const line of lines) {
      consumed += line.length + 1;
      const trimmed = line.trim();
      if (CONTAINER_NESTED_OPEN.test(trimmed)) {
        depth += 1;
      } else if (trimmed === ':::') {
        depth -= 1;
        if (depth === 0) {
          closed = true;
          break;
        }
      }
      body.push(line);
    }
    if (!closed) {
      return undefined;
    }
    const token: Tokens.Generic = {
      type: 'docsContainer',
      raw: src.slice(0, consumed),
      variant: open[1],
      tokens: [],
    };
    this.lexer.blockTokens(body.join('\n'), token['tokens']);
    return token;
  },
  renderer(token: Tokens.Generic): string {
    const tag = token['variant'] === 'mode-cards' ? 'div' : 'section';
    const inner = this.parser.parse(token['tokens'] ?? []);
    return `<${tag} class="docs-${String(token['variant'])}">${inner}</${tag}>\n`;
  },
};

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
 * Heading `id` attributes are omitted on purpose — DomSanitizer strips them; the
 * docs-markdown component applies toc ids after sanitize.
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
    // Do not emit id= here. Angular's DomSanitizer strips `id` from [innerHTML]
    // (not in VALID_ATTRS), which logs a sanitization warning and breaks TOC
    // anchors. EpDocsMarkdown assigns ids after sanitize from `toc`.
    return `<h${depth}>${text}</h${depth}>`;
  };

  renderer.link = ({ href, title, text }: Tokens.Link): string => {
    const safeHref = resolveHref(href ?? '');
    const isExternal = /^(https?:)?\/\//i.test(safeHref);
    // FAQ question deep links open in a new tab so docs readers keep their place.
    const isFaqQuestion =
      /^\/faq(?:\/)?(?:#.+)?$/i.test(safeHref) || /^\/faq#/i.test(safeHref);
    const openBlank = isExternal || isFaqQuestion;
    const titleAttr = title ? ` title="${title}"` : '';
    const rel = openBlank ? ' rel="noopener noreferrer"' : '';
    const target = openBlank ? ' target="_blank"' : '';
    return `<a href="${safeHref}"${titleAttr}${rel}${target}>${text}</a>`;
  };

  renderer.html = (): string => {
    // Drop raw HTML from Markdown sources — content is authored as MD only.
    return '';
  };

  const html = new Marked({ extensions: [docsContainerExtension] }).parse(markdown, {
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
