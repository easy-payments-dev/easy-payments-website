import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export type EpBadgeVariant =
  | 'available'
  | 'coming-soon'
  | 'release-candidate'
  | 'info';

@Component({
  selector: 'ep-badge',
  imports: [NgClass],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class EpBadge {
  readonly variant = input<EpBadgeVariant>('info');

  protected readonly classes = computed(() => ({
    'ep-badge': true,
    [`ep-badge--${this.variant()}`]: true,
  }));
}
