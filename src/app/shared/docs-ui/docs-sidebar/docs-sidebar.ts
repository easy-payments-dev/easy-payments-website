import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface DocsNavItem {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
}

export interface DocsNavGroup {
  title: string;
  items: readonly DocsNavItem[];
}

@Component({
  selector: 'ep-docs-sidebar',
  imports: [NgClass, RouterLink],
  templateUrl: './docs-sidebar.html',
  styleUrl: './docs-sidebar.scss',
})
export class EpDocsSidebar {
  readonly groups = input.required<readonly DocsNavGroup[]>();
  readonly ariaLabel = input('Documentation');
}
