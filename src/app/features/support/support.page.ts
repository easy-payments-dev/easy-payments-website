import { Component, inject } from '@angular/core';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { SupportProjectCard } from '../../shared/support/support-project-card';
import { EpContainer } from '../../shared/ui/container/container';

@Component({
  selector: 'app-support-page',
  imports: [EpContainer, SupportProjectCard],
  templateUrl: './support.page.html',
  styleUrl: './support.page.scss',
})
export class SupportPage {
  private readonly i18n = inject(SiteI18nService);

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }
}
