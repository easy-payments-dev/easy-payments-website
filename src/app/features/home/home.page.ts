import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { getLatestPublishedAngularVersion } from '../../data/frameworks';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly siteName = environment.siteName;
  protected readonly tagline = environment.tagline;
  protected readonly latestAngular = getLatestPublishedAngularVersion();
}
