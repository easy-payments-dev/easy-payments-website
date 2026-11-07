import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EpButton } from '../../shared/ui/button/button';
import { EpContainer } from '../../shared/ui/container/container';
import { EpEmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-not-found-page',
  imports: [EpContainer, EpEmptyState, EpButton],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
})
export class NotFoundPage {
  protected readonly siteName = environment.siteName;
}
