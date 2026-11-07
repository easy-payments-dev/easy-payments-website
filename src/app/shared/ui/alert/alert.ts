import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export type EpAlertVariant = 'info' | 'warning' | 'error' | 'security';

@Component({
  selector: 'ep-alert',
  imports: [NgClass],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class EpAlert {
  readonly variant = input<EpAlertVariant>('info');
  readonly title = input<string | undefined>(undefined);

  protected readonly classes = computed(() => ({
    'ep-alert': true,
    [`ep-alert--${this.variant()}`]: true,
  }));

  protected readonly role = computed(() =>
    this.variant() === 'error' || this.variant() === 'warning' ? 'alert' : 'status',
  );
}
