import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
  protected readonly year = new Date().getFullYear();
}
