import { Component, signal } from '@angular/core';
import { getFramework, getLatestPublishedAngularVersion } from '../../data/frameworks';
import { EpDocsPageHeader } from '../../shared/docs-ui/docs-page-header/docs-page-header';
import { EpDocsPager } from '../../shared/docs-ui/docs-pager/docs-pager';
import { EpDocsShell } from '../../shared/docs-ui/docs-shell/docs-shell';
import { DocsNavGroup, EpDocsSidebar } from '../../shared/docs-ui/docs-sidebar/docs-sidebar';
import { DocsTocItem, EpDocsToc } from '../../shared/docs-ui/docs-toc/docs-toc';
import {
  DocsSelectOption,
  EpDocsToolbar,
} from '../../shared/docs-ui/docs-toolbar/docs-toolbar';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpBadge } from '../../shared/ui/badge/badge';
import { EpCodeBlock } from '../../shared/ui/code-block/code-block';
import { EpContainer } from '../../shared/ui/container/container';
import { EpTabs } from '../../shared/ui/tabs/tabs';
import { EpTabPanel } from '../../shared/ui/tabs/tab-panel';

@Component({
  selector: 'app-docs-angular-page',
  imports: [
    EpContainer,
    EpDocsShell,
    EpDocsSidebar,
    EpDocsToolbar,
    EpDocsPageHeader,
    EpDocsToc,
    EpDocsPager,
    EpAlert,
    EpBadge,
    EpCodeBlock,
    EpTabs,
    EpTabPanel,
  ],
  templateUrl: './docs-angular.page.html',
  styleUrl: './docs-angular.page.scss',
})
export class DocsAngularPage {
  protected readonly angular = getFramework('angular');
  protected readonly latestPublished = getLatestPublishedAngularVersion();
  protected readonly pageDescription =
    `Placeholder content for the latest published Angular library version (${getLatestPublishedAngularVersion()}).`;
  protected readonly selectedFramework = signal('angular');
  protected readonly selectedVersion = signal(getLatestPublishedAngularVersion());

  protected readonly frameworkOptions: readonly DocsSelectOption[] = [
    { value: 'angular', label: 'Angular' },
    { value: 'react', label: 'React (Coming Soon)', disabled: true },
    { value: 'vue', label: 'Vue (Coming Soon)', disabled: true },
    { value: 'svelte', label: 'Svelte (Coming Soon)', disabled: true },
  ];

  protected readonly versionOptions: readonly DocsSelectOption[] = [
    { value: '1.1.0', label: '1.1.0 (latest published)' },
    { value: '1.0.0', label: '1.0.0' },
    { value: '1.2.0', label: '1.2.0 (release candidate)', disabled: true },
  ];

  protected readonly navGroups: readonly DocsNavGroup[] = [
    {
      title: 'Get started',
      items: [
        { id: 'overview', label: 'Overview', active: true },
        { id: 'installation', label: 'Installation', disabled: true },
        { id: 'quickstart', label: 'Quickstart', disabled: true },
      ],
    },
    {
      title: 'Guides',
      items: [
        { id: 'providers', label: 'Providers', disabled: true },
        { id: 'security', label: 'Security notes', disabled: true },
      ],
    },
  ];

  protected readonly tocItems: readonly DocsTocItem[] = [
    { id: 'published-version', label: 'Published version', active: true },
    { id: 'version-status', label: 'Version status' },
    { id: 'example', label: 'Example surface' },
  ];

  protected readonly exampleCode = `import { provideEasyPayments } from 'easy-payments';

export const appConfig = {
  providers: [
    provideEasyPayments({
      // Consumer apps configure providers.
      // This website does not process payments.
    }),
  ],
};`;

  protected onFrameworkChange(value: string): void {
    if (value === 'angular') {
      this.selectedFramework.set(value);
    }
  }

  protected onVersionChange(value: string): void {
    if (value === '1.0.0' || value === '1.1.0') {
      this.selectedVersion.set(value);
    }
  }
}
