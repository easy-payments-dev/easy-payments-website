import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'ep-code-block',
  templateUrl: './code-block.html',
  styleUrl: './code-block.scss',
})
export class EpCodeBlock {
  private readonly platformId = inject(PLATFORM_ID);
  private copyResetHandle: ReturnType<typeof setTimeout> | null = null;

  readonly code = input.required<string>();
  readonly language = input('typescript');
  readonly label = input<string | undefined>(undefined);

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      if (this.copyResetHandle) {
        clearTimeout(this.copyResetHandle);
      }
      this.copyResetHandle = setTimeout(() => this.copied.set(false), 1800);
    } catch {
      this.copied.set(false);
    }
  }
}
