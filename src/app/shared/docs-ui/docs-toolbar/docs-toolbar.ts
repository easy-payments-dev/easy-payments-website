import { Component, input, output } from '@angular/core';

export interface DocsSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'ep-docs-toolbar',
  templateUrl: './docs-toolbar.html',
  styleUrl: './docs-toolbar.scss',
})
export class EpDocsToolbar {
  readonly frameworks = input.required<readonly DocsSelectOption[]>();
  readonly versions = input.required<readonly DocsSelectOption[]>();
  readonly selectedFramework = input.required<string>();
  readonly selectedVersion = input.required<string>();
  readonly searchLabel = input('Search docs');

  readonly frameworkChange = output<string>();
  readonly versionChange = output<string>();
  readonly searchClick = output<void>();

  protected onFrameworkChange(event: Event): void {
    this.frameworkChange.emit((event.target as HTMLSelectElement).value);
  }

  protected onVersionChange(event: Event): void {
    this.versionChange.emit((event.target as HTMLSelectElement).value);
  }
}
