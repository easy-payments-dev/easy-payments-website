import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { BRAND_ASSETS } from '../../brand/brand-assets';
import { SiteI18nService } from '../../i18n/site-i18n.service';
import { SiteMessageKey } from '../../i18n/site-messages';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  private readonly i18n = inject(SiteI18nService);

  protected readonly siteName = environment.siteName;
  protected readonly githubUrl = environment.githubUrl;
  protected readonly githubAngularUrl = environment.githubAngularUrl;
  protected readonly license = environment.license;
  protected readonly year = new Date().getFullYear();
  /** Footer surface is always dark — use the contrast-adapted official lockup. */
  protected readonly lockupSrc = BRAND_ASSETS.headerLockupDark;
  protected readonly language = this.i18n.language;

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }
}
