import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface DocsPagerLink {
  label: string;
  href: string;
}

@Component({
  selector: 'ep-docs-pager',
  imports: [RouterLink],
  templateUrl: './docs-pager.html',
  styleUrl: './docs-pager.scss',
})
export class EpDocsPager {
  readonly previous = input<DocsPagerLink | null>(null);
  readonly next = input<DocsPagerLink | null>(null);
}
