import { Component, input } from '@angular/core';

@Component({
  selector: 'ep-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.scss',
})
export class EpSectionHeading {
  readonly eyebrow = input<string | undefined>(undefined);
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly headingLevel = input<1 | 2 | 3>(1);
}
