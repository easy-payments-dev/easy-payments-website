import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteI18nService } from '../../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../../core/i18n/site-messages';

export interface DocsPagerLink {
  label: string;
  href: string;
}

@Component({
  selector: 'ep-docs-pager',
  imports: [RouterLink],
  templateUrl: './docs-pager.html',
  styleUrl: './docs-pager.scss',
})
export class EpDocsPager {
  private readonly i18n = inject(SiteI18nService);

  readonly previous = input<DocsPagerLink | null>(null);
  readonly next = input<DocsPagerLink | null>(null);

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }
}
