import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsSearchHit } from '../../core/docs/docs.types';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';

@Component({
  selector: 'app-docs-search-dialog',
  imports: [RouterLink],
  templateUrl: './docs-search-dialog.html',
  styleUrl: './docs-search-dialog.scss',
})
export class DocsSearchDialog {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(SiteI18nService);
  private readonly inputRef =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private previouslyFocused: HTMLElement | null = null;

  readonly open = input(false);
  readonly query = input('');
  readonly scope = input<'current' | 'all'>('current');
  readonly hits = input<readonly DocsSearchHit[]>([]);
  readonly frameworkLabel = input('Angular');
  readonly versionLabel = input('');

  readonly queryChange = output<string>();
  readonly scopeChange = output<'current' | 'all'>();
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      if (this.open()) {
        this.previouslyFocused =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        queueMicrotask(() => this.inputRef()?.nativeElement.focus());
      } else if (this.previouslyFocused) {
        const restore = this.previouslyFocused;
        this.previouslyFocused = null;
        queueMicrotask(() => restore.focus());
      }
    });
  }

  protected onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected onScopeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'current' | 'all';
    this.scopeChange.emit(value);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected t(key: SiteMessageKey, params?: Record<string, string>): string {
    return this.i18n.t(key, params);
  }

  protected matchLabel(kind: DocsSearchHit['matchKind']): string {
    switch (kind) {
      case 'title':
        return this.i18n.t('docs.search.matchTitle');
      case 'heading':
        return this.i18n.t('docs.search.matchHeading');
      default:
        return this.i18n.t('docs.search.matchContent');
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }
}
