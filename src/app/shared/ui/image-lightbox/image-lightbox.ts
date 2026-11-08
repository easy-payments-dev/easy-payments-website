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

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

@Component({
  selector: 'ep-image-lightbox',
  templateUrl: './image-lightbox.html',
  styleUrl: './image-lightbox.scss',
})
export class EpImageLightbox {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly closeButton =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private previousOverflow = '';
  private previouslyFocused: HTMLElement | null = null;

  readonly open = input(false);
  readonly image = input<LightboxImage | null>(null);
  readonly closed = output<void>();

  protected readonly dialogId = 'ep-image-lightbox-title';

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (isOpen) {
        this.previouslyFocused =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        this.previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        queueMicrotask(() => this.closeButton()?.nativeElement.focus());
      } else {
        document.body.style.overflow = this.previousOverflow;
        const restore = this.previouslyFocused;
        this.previouslyFocused = null;
        queueMicrotask(() => restore?.focus());
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
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
