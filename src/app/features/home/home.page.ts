import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BRAND_ASSETS } from '../../core/brand/brand-assets';
import { getLatestPublishedAngularVersion } from '../../data/frameworks';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpButton } from '../../shared/ui/button/button';
import { EpCodeBlock } from '../../shared/ui/code-block/code-block';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-home-page',
  imports: [EpContainer, EpSectionHeading, EpButton, EpAlert, EpCodeBlock],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly siteName = environment.siteName;
  protected readonly tagline = environment.tagline;
  protected readonly logoLockup = BRAND_ASSETS.logoLockup;
  protected readonly latestAngular = getLatestPublishedAngularVersion();
  protected readonly description =
    `Foundation placeholder for the Easy Payments marketing site. The full landing experience arrives in W3. Angular documentation currently tracks published version ${this.latestAngular}.`;

  protected readonly installExample = `npm install easy-payments
# Latest published Angular library: ${getLatestPublishedAngularVersion()}`;
}
