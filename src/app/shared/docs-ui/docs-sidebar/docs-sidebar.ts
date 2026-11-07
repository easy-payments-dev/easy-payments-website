import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

export interface DocsNavItem {
  id: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

export interface DocsNavGroup {
  title: string;
  items: readonly DocsNavItem[];
}

@Component({
  selector: 'ep-docs-sidebar',
  imports: [NgClass],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.scss',
})
export class EpDocsSidebar {
  readonly groups = input.required<readonly DocsNavGroup[]>();
  readonly ariaLabel = input('Documentation');
}
