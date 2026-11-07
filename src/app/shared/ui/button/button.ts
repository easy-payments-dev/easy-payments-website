import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type EpButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type EpButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ep-button',
  imports: [NgClass, RouterLink],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class EpButton {
  readonly variant = input<EpButtonVariant>('primary');
  readonly size = input<EpButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly href = input<string | undefined>(undefined);
  readonly routerLink = input<string | readonly string[] | undefined>(undefined);
  readonly external = input(false);
  readonly fullWidth = input(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  protected readonly classes = computed(() => ({
    'ep-button': true,
    [`ep-button--${this.variant()}`]: true,
    [`ep-button--${this.size()}`]: true,
    'ep-button--loading': this.loading(),
    'ep-button--block': this.fullWidth(),
  }));
}
