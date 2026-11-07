import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'ep-tab-panel',
  templateUrl: './tab-panel.html',
  styleUrl: './tab-panel.scss',
  host: {
    role: 'tabpanel',
    '[id]': '"panel-" + id()',
    '[attr.aria-labelledby]': '"tab-" + id()',
    '[hidden]': '!active()',
    '[attr.tabindex]': '0',
  },
})
export class EpTabPanel {
  readonly id = input.required<string>();
  readonly label = input.required<string>();

  /** Managed by `EpTabs`. */
  readonly active = signal(false);
}
