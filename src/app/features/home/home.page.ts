import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
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
import { EpImageLightbox } from '../../shared/ui/image-lightbox/image-lightbox';
import { EpSectionHeading } from '../../shared/ui/section-heading/section-heading';

type GalleryShotId = 'desktop' | 'mobile' | 'dark' | 'light' | 'methods';

interface GalleryShot {
  id: GalleryShotId;
  src: string;
  alt: string;
  caption: string;
  frame: 'landscape' | 'portrait';
}

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
    EpImageLightbox,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly i18n = inject(SiteI18nService);

  protected readonly tagline = environment.tagline;
  protected readonly githubUrl = environment.githubUrl;
  protected readonly playgroundTitle = computed(() =>
    this.i18n.t('home.playgroundTitle'),
  );
  protected readonly playgroundBody = computed(() =>
    this.i18n.t('home.playgroundBody'),
  );
  protected readonly playgroundCta = computed(() =>
    this.i18n.t('home.playgroundCta'),
  );
  /** Hero checkout preview — swaps with site language without a reload. */
  protected readonly previewSrc = computed(
    () => `screenshots/checkout-desktop-${this.i18n.language()}.png`,
  );
  protected readonly previewAlt = computed(() => this.i18n.t('home.previewAlt'));
  protected readonly previewCaption = computed(() =>
    this.i18n.t('home.previewCaption'),
  );
  protected readonly galleryEyebrow = computed(() =>
    this.i18n.t('home.gallery.eyebrow'),
  );
  protected readonly galleryTitle = computed(() =>
    this.i18n.t('home.gallery.title'),
  );
  protected readonly galleryDescription = computed(() =>
    this.i18n.t('home.gallery.description'),
  );
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
      body: 'Full Checkout, Buttons Only, and Headless are all available in Angular 1.2.0.',
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
      versionNote: `Available in Angular ${getLatestPublishedAngularVersion()}`,
      body: 'Complete checkout UI with order summary, payment method selection, and confirm actions.',
    },
    {
      name: 'Buttons Only',
      status: 'available' as const,
      versionNote: `Available in Angular ${getLatestPublishedAngularVersion()}`,
      body: 'Render provider buttons and card expansion without the full checkout shell.',
    },
    {
      name: 'Headless',
      status: 'available' as const,
      versionNote: `Available in Angular ${getLatestPublishedAngularVersion()}`,
      body: 'Programmatic checkout control for custom UI shells.',
    },
  ] as const;

  /** All five gallery shots — src/labels follow the active site locale. */
  protected readonly galleryShots = computed<GalleryShot[]>(() => {
    const lang = this.i18n.language();
    return [
      {
        id: 'desktop',
        src: `screenshots/checkout-desktop-${lang}.png`,
        alt: this.i18n.t('home.gallery.desktopAlt'),
        caption: this.i18n.t('home.gallery.desktop'),
        frame: 'landscape',
      },
      {
        id: 'mobile',
        src: `screenshots/checkout-mobile-${lang}.png`,
        alt: this.i18n.t('home.gallery.mobileAlt'),
        caption: this.i18n.t('home.gallery.mobile'),
        frame: 'portrait',
      },
      {
        id: 'dark',
        src: `screenshots/checkout-dark-${lang}.png`,
        alt: this.i18n.t('home.gallery.darkAlt'),
        caption: this.i18n.t('home.gallery.dark'),
        frame: 'landscape',
      },
      {
        id: 'light',
        src: `screenshots/checkout-light-${lang}.png`,
        alt: this.i18n.t('home.gallery.lightAlt'),
        caption: this.i18n.t('home.gallery.light'),
        frame: 'landscape',
      },
      {
        id: 'methods',
        src: `screenshots/checkout-methods-${lang}.png`,
        alt: this.i18n.t('home.gallery.methodsAlt'),
        caption: this.i18n.t('home.gallery.methods'),
        frame: 'landscape',
      },
    ];
  });

  protected readonly featuredShot = computed(
    () => this.galleryShots()[0] ?? null,
  );
  protected readonly galleryThumbs = computed(() => this.galleryShots().slice(1));

  protected readonly lightboxOpen = signal(false);
  /** Shot id — keeps lightbox image/labels in sync if language changes while open. */
  protected readonly lightboxShotId = signal<GalleryShotId | null>(null);
  protected readonly lightboxImage = computed(() => {
    const id = this.lightboxShotId();
    if (!id) {
      return null;
    }
    return this.galleryShots().find((shot) => shot.id === id) ?? null;
  });
  private lightboxTrigger: HTMLElement | null = null;

  protected enlargeLabel(caption: string): string {
    return this.i18n.t('home.gallery.enlarge', { label: caption });
  }

  protected openLightbox(event: Event, shot: GalleryShot): void {
    this.lightboxTrigger = event.currentTarget as HTMLElement;
    this.lightboxShotId.set(shot.id);
    this.lightboxOpen.set(true);
  }

  protected closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.lightboxShotId.set(null);
    this.lightboxTrigger?.focus();
    this.lightboxTrigger = null;
  }

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
