import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-support-project-card',
  imports: [RouterLink],
  templateUrl: './support-project-card.html',
  styleUrl: './support-project-card.scss',
})
export class SupportProjectCard {
  private readonly i18n = inject(SiteI18nService);

  /** Compact footer-style vs full docs card. */
  readonly variant = input<'card' | 'compact'>('card');

  protected readonly language = this.i18n.language;
  protected readonly githubUrl = environment.githubAngularUrl;
  protected readonly githubIssuesUrl = `${environment.githubAngularUrl}/issues`;
  protected readonly paypalUrl = computed(() => {
    void this.language();
    return isHttpUrl(environment.paypalSupportUrl)
      ? environment.paypalSupportUrl
      : null;
  });

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }
}
