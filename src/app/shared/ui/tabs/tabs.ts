import { NgClass } from '@angular/common';
import {
  Component,
  contentChildren,
  effect,
  input,
  model,
} from '@angular/core';
import { EpTabPanel } from './tab-panel';

@Component({
  selector: 'ep-tabs',
  imports: [NgClass],
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class EpTabs {
  readonly ariaLabel = input('Tabs');
  readonly activeId = model<string | null>(null);

  protected readonly panels = contentChildren(EpTabPanel);

  constructor() {
    effect(() => {
      const items = this.panels();
      if (!items.length) {
        return;
      }

      const current = this.activeId();
      const selected =
        items.find((panel) => panel.id() === current) ?? items[0];

      if (this.activeId() !== selected.id()) {
        this.activeId.set(selected.id());
      }

      for (const panel of items) {
        panel.active.set(panel.id() === selected.id());
      }
    });
  }

  protected select(id: string): void {
    this.activeId.set(id);
  }

  protected isActive(id: string): boolean {
    return this.activeId() === id;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.panels();
    if (!items.length) {
      return;
    }

    const currentId = this.activeId();
    const currentIndex = Math.max(
      0,
      items.findIndex((panel) => panel.id() === currentId),
    );

    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = items[nextIndex];
    this.activeId.set(next.id());

    const button = (event.currentTarget as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex);
    button?.focus();
  }
}
