import { Component, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpButton } from '../../shared/ui/button/button';
import { EpCard } from '../../shared/ui/card/card';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-security-page',
  imports: [EpContainer, EpSectionHeading, EpCard, EpAlert, EpButton],
  templateUrl: './security.page.html',
  styleUrl: './security.page.scss',
})
export class SecurityPage {
  private readonly i18n = inject(SiteI18nService);

  protected readonly githubUrl = environment.githubUrl;

  protected readonly principles = computed(() => {
    void this.i18n.language();
    return [
      {
        title: this.i18n.t('security.principle.noSecrets.title'),
        body: this.i18n.t('security.principle.noSecrets.body'),
      },
      {
        title: this.i18n.t('security.principle.noProcessing.title'),
        body: this.i18n.t('security.principle.noProcessing.body'),
      },
      {
        title: this.i18n.t('security.principle.versioning.title'),
        body: this.i18n.t('security.principle.versioning.body'),
      },
    ] as const;
  });

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }
}
