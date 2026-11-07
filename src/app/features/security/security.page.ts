import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpButton } from '../../shared/ui/button/button';
import { EpCard } from '../../shared/ui/card/card';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-security-page',
  imports: [EpContainer, EpSectionHeading, EpCard, EpAlert, EpButton],
  templateUrl: './security.page.html',
  styleUrl: './security.page.scss',
})
export class SecurityPage {
  protected readonly githubUrl = environment.githubUrl;

  protected readonly principles = [
    {
      title: 'No secrets on this site',
      body: 'This website is a static marketing and documentation surface. It does not embed payment credentials, provider secret keys, or private environment values.',
    },
    {
      title: 'No payment processing here',
      body: 'Checkout, tokenization, and provider calls belong in consumer applications that integrate the Easy Payments libraries — not on this public website.',
    },
    {
      title: 'Honest versioning',
      body: 'Only published package versions are presented as current. Release candidates are labeled clearly and are not treated as production releases.',
    },
  ] as const;
}
