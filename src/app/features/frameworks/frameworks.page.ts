import { Component } from '@angular/core';
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
  protected readonly frameworks = FRAMEWORKS;

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
        return 'Available';
      case 'release-candidate':
        return 'Release candidate';
      case 'coming-soon':
        return 'Coming soon';
    }
  }
}
