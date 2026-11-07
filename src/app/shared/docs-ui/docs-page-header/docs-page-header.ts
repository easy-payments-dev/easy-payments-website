import { Component, input } from '@angular/core';
import { EpBadge, EpBadgeVariant } from '../../ui/badge/badge';

@Component({
  selector: 'ep-docs-page-header',
  imports: [EpBadge],
  templateUrl: './docs-page-header.html',
  styleUrl: './docs-page-header.scss',
})
export class EpDocsPageHeader {
  readonly eyebrow = input<string | undefined>(undefined);
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly badgeLabel = input<string | undefined>(undefined);
  readonly badgeVariant = input<EpBadgeVariant>('info');
}
