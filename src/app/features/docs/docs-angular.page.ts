import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getFramework, getLatestPublishedAngularVersion } from '../../data/frameworks';

@Component({
  selector: 'app-docs-angular-page',
  imports: [RouterLink],
  templateUrl: './docs-angular.page.html',
  styleUrl: './docs-angular.page.scss',
})
export class DocsAngularPage {
  protected readonly angular = getFramework('angular');
  protected readonly latestPublished = getLatestPublishedAngularVersion();
}
