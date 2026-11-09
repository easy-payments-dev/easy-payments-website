import { renderDocsMarkdown } from './markdown.renderer';

describe('renderDocsMarkdown', () => {
  it('renders headings with stable anchors and strips raw HTML', () => {
    const result = renderDocsMarkdown(`
# Title

## Section One

<script>alert('x')</script>

Paragraph with \`code\`.
`);

    expect(result.html).toContain('id="section-one"');
    expect(result.html).not.toContain('<script>');
    expect(result.toc.some((item) => item.id === 'section-one')).toBe(true);
  });

  it('renders ::: mode-cards containers as a card grid with markdown content', () => {
    const result = renderDocsMarkdown(
      `
::: mode-cards
::: mode-card
## Alpha

- **When to use:** now

[Try demo](/playground?demo=full) · [View guide](./full-checkout)
:::
::: mode-card
## Beta

- **When to use:** later
:::
:::

## After cards
`,
      { docsBasePath: '/docs/angular/1.2.0' },
    );

    expect(result.html).toContain('<div class="docs-mode-cards">');
    expect(result.html.match(/<section class="docs-mode-card">/g)).toHaveLength(2);
    expect(result.html).toContain('id="alpha"');
    expect(result.html).toContain('href="/playground?demo=full"');
    expect(result.html).toContain('href="/docs/angular/1.2.0/full-checkout"');
    expect(result.toc.map((item) => item.id)).toEqual([
      'alpha',
      'beta',
      'after-cards',
    ]);
    expect(result.plainText).not.toContain(':::');
  });

  it('resolves relative docs links against the version base path', () => {
    const result = renderDocsMarkdown('[Install](./installation)', {
      docsBasePath: '/docs/angular/1.1.0',
    });
    expect(result.html).toContain('href="/docs/angular/1.1.0/installation"');
  });

  it('marks external links with noopener', () => {
    const result = renderDocsMarkdown(
      '[npm](https://www.npmjs.com/package/@easy-payments/angular)',
    );
    expect(result.html).toContain('rel="noopener noreferrer"');
    expect(result.html).toContain('target="_blank"');
  });

  it('opens /faq#methods-status links in a new tab with noopener', () => {
    const result = renderDocsMarkdown('[Methods status](/faq#methods-status)');
    expect(result.html).toContain('href="/faq#methods-status"');
    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noopener noreferrer"');
  });
});
