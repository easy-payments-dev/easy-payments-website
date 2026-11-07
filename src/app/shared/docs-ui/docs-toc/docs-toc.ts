import { Component, input } from '@angular/core';

export interface DocsTocItem {
  id: string;
  label: string;
  active?: boolean;
}

@Component({
  selector: 'ep-docs-toc',
  templateUrl: './docs-toc.html',
  styleUrl: './docs-toc.scss',
})
export class EpDocsToc {
  readonly items = input.required<readonly DocsTocItem[]>();
  readonly title = input('On this page');
}
