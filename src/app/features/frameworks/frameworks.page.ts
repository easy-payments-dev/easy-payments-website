import { Component, inject } from '@angular/core';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { FRAMEWORKS } from '../../data/frameworks';
import { ReleaseStatus } from '../../data/version.types';
import { EpBadge, EpBadgeVariant } from '../../shared/ui/badge/badge';
import { EpButton } from '../../shared/ui/button/button';
import { EpCard } from '../../shared/ui/card/card';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-frameworks-page',
  imports: [EpContainer, EpSectionHeading, EpCard, EpBadge, EpButton],
  templateUrl: './frameworks.page.html',
  styleUrl: './frameworks.page.scss',
})
export class FrameworksPage {
  private readonly i18n = inject(SiteI18nService);

  protected readonly frameworks = FRAMEWORKS;

  protected t(key: SiteMessageKey, params?: Record<string, string>): string {
    return this.i18n.t(key, params);
  }

  protected badgeVariant(status: ReleaseStatus): EpBadgeVariant {
    switch (status) {
      case 'published':
        return 'available';
      case 'release-candidate':
        return 'release-candidate';
      case 'coming-soon':
        return 'coming-soon';
    }
  }

  protected statusLabel(status: ReleaseStatus): string {
    switch (status) {
      case 'published':
        return this.i18n.t('status.available');
      case 'release-candidate':
        return this.i18n.t('status.releaseCandidate');
      case 'coming-soon':
        return this.i18n.t('status.comingSoon');
    }
  }
}
