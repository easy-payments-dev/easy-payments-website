import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BRAND_ASSETS } from '../../core/brand/brand-assets';
import { FRAMEWORKS, getLatestPublishedAngularVersion } from '../../data/frameworks';
import {
  PAYMENT_METHODS,
  UNSUPPORTED_METHODS,
} from '../../data/payment-methods';
import { ReleaseStatus } from '../../data/version.types';
import { EpAlert } from '../../shared/ui/alert/alert';
import { EpBadge, EpBadgeVariant } from '../../shared/ui/badge/badge';
import { EpButton } from '../../shared/ui/button/button';
import { EpCard } from '../../shared/ui/card/card';
import { EpCodeBlock } from '../../shared/ui/code-block/code-block';
import { EpContainer } from '../../shared/ui/container/container';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    EpContainer,
    EpSectionHeading,
    EpButton,
    EpBadge,
    EpCard,
    EpAlert,
    EpCodeBlock,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly siteName = environment.siteName;
  protected readonly tagline = environment.tagline;
  protected readonly logoLockup = BRAND_ASSETS.logoLockup;
  protected readonly githubUrl = environment.githubUrl;
  protected readonly githubAngularUrl = environment.githubAngularUrl;
  protected readonly githubWebsiteUrl = environment.githubWebsiteUrl;
  protected readonly npmAngularUrl = environment.npmAngularUrl;
  protected readonly securityDocsUrl = environment.angularSecurityDocsUrl;
  protected readonly license = environment.license;
  protected readonly packageName = environment.angularPackageName;
  protected readonly latestAngular = getLatestPublishedAngularVersion();
  protected readonly frameworks = FRAMEWORKS;
  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly unsupportedMethods = UNSUPPORTED_METHODS;

  protected readonly installCommand =
    `npm install ${environment.angularPackageName} @stripe/stripe-js`;

  protected readonly benefits = [
    {
      title: 'Reusable payment integrations',
      body: 'One Angular API for card, wallets, PayPal, Klarna, and Affirm instead of stitching every provider SDK yourself.',
    },
    {
      title: 'Flexible checkout experiences',
      body: 'Published Full Checkout covers the complete selector UI. Additional modes arrive with Angular v1.2.0.',
    },
    {
      title: 'TypeScript-friendly APIs',
      body: 'Strongly typed configuration and events designed for Angular applications on modern TypeScript.',
    },
    {
      title: 'Theme customization',
      body: 'Light and dark checkout surfaces with appearance controls that fit your product UI.',
    },
    {
      title: 'Localization',
      body: 'Built-in UI localization for English, Spanish, and Portuguese, including auto locale detection.',
    },
    {
      title: 'Provider integrations',
      body: 'Works with your Stripe, PayPal, and related merchant accounts — Easy Payments is not a processor.',
    },
    {
      title: 'Open-source MIT licensing',
      body: 'Inspect the code, contribute improvements, and ship under the MIT license.',
    },
  ] as const;

  protected readonly experiences = [
    {
      name: 'Full Checkout',
      status: 'available' as const,
      versionNote: `Available in published Angular ${getLatestPublishedAngularVersion()}`,
      body: 'Complete checkout UI with order summary, payment method selection, and confirm actions.',
    },
    {
      name: 'Buttons Only',
      status: 'preview' as const,
      versionNote: 'Coming in Angular v1.2.0',
      body: 'Render provider buttons and card expansion without the full checkout shell. Not part of npm 1.1.0.',
    },
    {
      name: 'Headless',
      status: 'preview' as const,
      versionNote: 'Coming in Angular v1.2.0',
      body: 'Programmatic checkout control for custom UI shells. Preview in the 1.2.0 release candidate only.',
    },
  ] as const;

  protected readonly screenshots = [
    {
      src: 'screenshots/checkout-desktop.png',
      alt: 'Easy Payments full checkout on desktop showing payment method selection in light mode',
      caption: 'Desktop · Full Checkout',
    },
    {
      src: 'screenshots/checkout-mobile.png',
      alt: 'Easy Payments full checkout on a mobile viewport with stacked payment methods',
      caption: 'Mobile · Full Checkout',
    },
    {
      src: 'screenshots/checkout-dark.png',
      alt: 'Easy Payments checkout in dark appearance with Card selected',
      caption: 'Dark appearance',
    },
    {
      src: 'screenshots/checkout-methods.png',
      alt: 'Easy Payments checkout highlighting payment method order and DEMO labels',
      caption: 'Method selection',
    },
  ] as const;

  protected badgeVariant(status: ReleaseStatus): EpBadgeVariant {
    switch (status) {
      case 'published':
        return 'available';
      case 'release-candidate':
        return 'release-candidate';
      case 'coming-soon':
        return 'coming-soon';
    }
  }

  protected statusLabel(status: ReleaseStatus): string {
    switch (status) {
      case 'published':
        return 'Available';
      case 'release-candidate':
        return 'Release candidate';
      case 'coming-soon':
        return 'Coming soon';
    }
  }

  protected availabilityLabel(
    availability: (typeof PAYMENT_METHODS)[number]['availability'],
  ): string {
    switch (availability) {
      case 'available-with-config':
        return 'Available with config';
      case 'provider-dependent':
        return 'Provider setup required';
      case 'not-supported':
        return 'Not supported';
    }
  }
}
