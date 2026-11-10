import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { DocsTocHeading } from '../../../core/docs/docs.types';
import { renderDocsMarkdown } from '../../../core/docs/markdown.renderer';
import { SiteI18nService } from '../../../core/i18n/site-i18n.service';

@Component({
  selector: 'ep-docs-markdown',
  templateUrl: './docs-markdown.html',
  styleUrl: './docs-markdown.scss',
})
export class EpDocsMarkdown {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly i18n = inject(SiteI18nService);

  readonly markdown = input.required<string>();
  readonly docsBasePath = input<string | undefined>(undefined);
  /**
   * Optional heading list (typically English-derived ids from the docs catalog).
   * When provided, these ids are applied to rendered headings instead of ids
   * generated from `markdown`, so `#fragment` links stay stable across languages.
   */
  readonly anchorToc = input<readonly DocsTocHeading[] | undefined>(undefined);
  readonly tocChange = output<readonly DocsTocHeading[]>();

  /** Plain HTML string — Angular [innerHTML] sanitizes; no bypassSecurityTrustHtml. */
  protected html = '';

  constructor() {
    effect(() => {
      const source = this.markdown();
      const anchorToc = this.anchorToc();
      // Re-run on language change so copy buttons get relabeled.
      void this.i18n.language();
      const rendered = renderDocsMarkdown(source, {
        docsBasePath: this.docsBasePath(),
      });
      this.html = rendered.html;
      this.tocChange.emit(rendered.toc);

      if (isPlatformBrowser(this.platformId)) {
        queueMicrotask(() => {
          this.enhanceHeadingAnchors(anchorToc ?? rendered.toc);
          this.enhanceCodeBlocks();
        });
      }
    });
  }

  protected async onCopyClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('.ep-md__copy') as HTMLButtonElement | null;
    if (!button) {
      return;
    }
    const pre = button.parentElement?.querySelector('code');
    const text = pre?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = this.i18n.t('copy.copied');
      button.classList.add('is-copied');
      window.setTimeout(() => {
        button.textContent = this.i18n.t('copy.label');
        button.classList.remove('is-copied');
      }, 1600);
    } catch {
      button.textContent = this.i18n.t('copy.failed');
    }
  }

  /**
   * Apply heading anchors after Angular sanitizes [innerHTML].
   * DomSanitizer removes `id` attributes, so TOC `#slug` links need this step.
   */
  private enhanceHeadingAnchors(toc: readonly DocsTocHeading[]): void {
    const root = this.host.nativeElement.querySelector('.ep-md');
    if (!root || toc.length === 0) {
      return;
    }
    const headings = root.querySelectorAll('h2, h3');
    toc.forEach((item, index) => {
      const heading = headings.item(index);
      if (heading) {
        heading.id = item.id;
      }
    });
  }

  private enhanceCodeBlocks(): void {
    const root = this.host.nativeElement.querySelector('.ep-md');
    if (!root) {
      return;
    }
    const label = this.i18n.t('copy.label');
    const ariaLabel = this.i18n.t('copy.aria');
    root.querySelectorAll('pre').forEach((pre: Element) => {
      const existing = pre.parentElement?.classList.contains('ep-md__code')
        ? (pre.parentElement.querySelector(
            '.ep-md__copy',
          ) as HTMLButtonElement | null)
        : null;
      if (pre.parentElement?.classList.contains('ep-md__code')) {
        // Already enhanced: refresh labels after a language change.
        if (existing) {
          existing.textContent = label;
          existing.setAttribute('aria-label', ariaLabel);
          existing.classList.remove('is-copied');
        }
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'ep-md__code';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ep-md__copy';
      button.textContent = label;
      button.setAttribute('aria-label', ariaLabel);
      pre.replaceWith(wrapper);
      wrapper.append(button, pre);
    });
  }
}
