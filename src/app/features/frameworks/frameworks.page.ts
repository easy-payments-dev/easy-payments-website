import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FRAMEWORKS } from '../../data/frameworks';
import { ReleaseStatus } from '../../data/version.types';

@Component({
  selector: 'app-frameworks-page',
  imports: [RouterLink],
  templateUrl: './frameworks.page.html',
  styleUrl: './frameworks.page.scss',
})
export class FrameworksPage {
  protected readonly frameworks = FRAMEWORKS;

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

  protected statusClass(status: ReleaseStatus): string {
    return `ep-status ep-status--${status}`;
  }
}
