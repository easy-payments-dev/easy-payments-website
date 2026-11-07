import { Component, input } from '@angular/core';

export interface DocsPagerLink {
  label: string;
  href: string;
}

@Component({
  selector: 'ep-docs-pager',
  templateUrl: './docs-pager.html',
  styleUrl: './docs-pager.scss',
})
export class EpDocsPager {
  readonly previous = input<DocsPagerLink | null>(null);
  readonly next = input<DocsPagerLink | null>(null);
}
