import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { BRAND_ASSETS } from '../../brand/brand-assets';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly siteName = environment.siteName;
  protected readonly tagline = environment.tagline;
  protected readonly githubUrl = environment.githubUrl;
  protected readonly githubAngularUrl = environment.githubAngularUrl;
  protected readonly license = environment.license;
  protected readonly brandMark = BRAND_ASSETS.mark64;
  protected readonly year = new Date().getFullYear();
}
