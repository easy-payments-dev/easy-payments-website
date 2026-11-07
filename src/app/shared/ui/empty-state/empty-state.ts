import { Component, input } from '@angular/core';
import { EpBadge, EpBadgeVariant } from '../badge/badge';

@Component({
  selector: 'ep-empty-state',
  imports: [EpBadge],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EpEmptyState {
  readonly eyebrow = input<string | undefined>(undefined);
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly badgeLabel = input('Coming soon');
  readonly badgeVariant = input<EpBadgeVariant>('coming-soon');
}
