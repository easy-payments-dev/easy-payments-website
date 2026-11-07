import { NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export type EpContainerWidth = 'default' | 'narrow' | 'wide';

@Component({
  selector: 'ep-container',
  imports: [NgClass],
  templateUrl: './container.html',
  styleUrl: './container.scss',
})
export class EpContainer {
  readonly width = input<EpContainerWidth>('default');

  protected readonly classes = computed(() => ({
    'ep-container': true,
    [`ep-container--${this.width()}`]: true,
  }));
}
