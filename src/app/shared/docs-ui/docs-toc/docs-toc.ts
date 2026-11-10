import { Component, computed, inject, input } from '@angular/core';
import { SiteI18nService } from '../../../core/i18n/site-i18n.service';

export interface DocsTocItem {
  id: string;
  label: string;
  active?: boolean;
}

@Component({
  selector: 'ep-docs-toc',
  templateUrl: './docs-toc.html',
  styleUrl: './docs-toc.scss',
})
export class EpDocsToc {
  private readonly i18n = inject(SiteI18nService);

  readonly items = input.required<readonly DocsTocItem[]>();
  readonly title = input<string | undefined>(undefined);

  protected readonly resolvedTitle = computed(
    () => this.title() ?? this.i18n.t('docs.toc.title'),
  );
}
