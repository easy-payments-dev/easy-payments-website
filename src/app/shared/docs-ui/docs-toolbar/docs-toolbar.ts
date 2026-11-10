import { Component, computed, inject, input, output } from '@angular/core';
import { SiteI18nService } from '../../../core/i18n/site-i18n.service';

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
  private readonly i18n = inject(SiteI18nService);

  readonly frameworks = input.required<readonly DocsSelectOption[]>();
  readonly versions = input.required<readonly DocsSelectOption[]>();
  readonly selectedFramework = input.required<string>();
  readonly selectedVersion = input.required<string>();
  readonly searchLabel = input<string | undefined>(undefined);

  readonly frameworkChange = output<string>();
  readonly versionChange = output<string>();
  readonly searchClick = output<void>();

  protected readonly frameworkLabel = computed(() =>
    this.i18n.t('docs.toolbar.framework'),
  );
  protected readonly frameworkAria = computed(() =>
    this.i18n.t('docs.toolbar.frameworkAria'),
  );
  protected readonly versionLabel = computed(() =>
    this.i18n.t('docs.toolbar.version'),
  );
  protected readonly versionAria = computed(() =>
    this.i18n.t('docs.toolbar.versionAria'),
  );
  protected readonly resolvedSearchLabel = computed(
    () => this.searchLabel() ?? this.i18n.t('docs.toolbar.search'),
  );

  protected onFrameworkChange(event: Event): void {
    this.frameworkChange.emit((event.target as HTMLSelectElement).value);
  }

  protected onVersionChange(event: Event): void {
    this.versionChange.emit((event.target as HTMLSelectElement).value);
  }
}
