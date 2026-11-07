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
});
