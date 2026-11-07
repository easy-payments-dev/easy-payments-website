import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export type EpCardVariant = 'feature' | 'framework' | 'provider';

@Component({
  selector: 'ep-card',
  imports: [NgClass],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class EpCard {
  readonly variant = input<EpCardVariant>('feature');

  protected readonly classes = computed(() => ({
    'ep-card': true,
    [`ep-card--${this.variant()}`]: true,
  }));
}
