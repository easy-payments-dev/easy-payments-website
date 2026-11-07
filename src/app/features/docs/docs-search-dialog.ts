import {
  Component,
  ElementRef,
  HostListener,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsSearchHit } from '../../core/docs/docs.types';

@Component({
  selector: 'app-docs-search-dialog',
  imports: [RouterLink],
  templateUrl: './docs-search-dialog.html',
  styleUrl: './docs-search-dialog.scss',
})
export class DocsSearchDialog {
  private readonly inputRef =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

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
      if (this.open()) {
        queueMicrotask(() => this.inputRef()?.nativeElement.focus());
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

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }
}
