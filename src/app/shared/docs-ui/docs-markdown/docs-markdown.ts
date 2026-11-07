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

@Component({
  selector: 'ep-docs-markdown',
  templateUrl: './docs-markdown.html',
  styleUrl: './docs-markdown.scss',
})
export class EpDocsMarkdown {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly markdown = input.required<string>();
  readonly docsBasePath = input<string | undefined>(undefined);
  readonly tocChange = output<readonly DocsTocHeading[]>();

  /** Plain HTML string — Angular [innerHTML] sanitizes; no bypassSecurityTrustHtml. */
  protected html = '';

  constructor() {
    effect(() => {
      const source = this.markdown();
      const rendered = renderDocsMarkdown(source, {
        docsBasePath: this.docsBasePath(),
      });
      this.html = rendered.html;
      this.tocChange.emit(rendered.toc);

      if (isPlatformBrowser(this.platformId)) {
        queueMicrotask(() => this.enhanceCodeBlocks());
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
      button.textContent = 'Copied';
      button.classList.add('is-copied');
      window.setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('is-copied');
      }, 1600);
    } catch {
      button.textContent = 'Copy failed';
    }
  }

  private enhanceCodeBlocks(): void {
    const root = this.host.nativeElement.querySelector('.ep-md');
    if (!root) {
      return;
    }
    root.querySelectorAll('pre').forEach((pre: Element) => {
      if (pre.parentElement?.classList.contains('ep-md__code')) {
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'ep-md__code';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ep-md__copy';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      pre.replaceWith(wrapper);
      wrapper.append(button, pre);
    });
  }
}
