import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
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

  protected readonly tagline = computed(() => this.i18n.t('brand.tagline'));
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
  protected readonly paymentMethods = computed(() => {
    void this.i18n.language();
    const summaryKeys = {
      card: 'payment.card.summary',
      paypal: 'payment.paypal.summary',
      'apple-pay': 'payment.applePay.summary',
      'google-pay': 'payment.googlePay.summary',
      klarna: 'payment.klarna.summary',
      affirm: 'payment.affirm.summary',
    } as const;
    return PAYMENT_METHODS.map((method) => ({
      ...method,
      summary: this.i18n.t(summaryKeys[method.id as keyof typeof summaryKeys]),
      markAlt:
        method.id === 'card'
          ? this.i18n.t('payment.card.markAlt')
          : method.markAlt,
    }));
  });
  protected readonly unsupportedMethods = UNSUPPORTED_METHODS;

  protected readonly installCommand =
    `npm install ${environment.angularPackageName} @stripe/stripe-js`;

  protected readonly benefits = computed(() => {
    void this.i18n.language();
    const version = this.latestAngular;
    return [
      {
        title: this.i18n.t('home.benefits.reusable.title'),
        body: this.i18n.t('home.benefits.reusable.body'),
      },
      {
        title: this.i18n.t('home.benefits.flexible.title'),
        body: this.i18n.t('home.benefits.flexible.body', { version }),
      },
      {
        title: this.i18n.t('home.benefits.typescript.title'),
        body: this.i18n.t('home.benefits.typescript.body'),
      },
      {
        title: this.i18n.t('home.benefits.theme.title'),
        body: this.i18n.t('home.benefits.theme.body'),
      },
      {
        title: this.i18n.t('home.benefits.localization.title'),
        body: this.i18n.t('home.benefits.localization.body'),
      },
      {
        title: this.i18n.t('home.benefits.providers.title'),
        body: this.i18n.t('home.benefits.providers.body'),
      },
      {
        title: this.i18n.t('home.benefits.opensource.title'),
        body: this.i18n.t('home.benefits.opensource.body'),
      },
    ] as const;
  });

  protected readonly experiences = computed(() => {
    void this.i18n.language();
    const versionNote = this.i18n.t('status.availableInAngular', {
      version: this.latestAngular,
    });
    return [
      {
        name: this.i18n.t('home.experiences.full.name'),
        status: 'available' as const,
        versionNote,
        body: this.i18n.t('home.experiences.full.body'),
      },
      {
        name: this.i18n.t('home.experiences.buttons.name'),
        status: 'available' as const,
        versionNote,
        body: this.i18n.t('home.experiences.buttons.body'),
      },
      {
        name: this.i18n.t('home.experiences.headless.name'),
        status: 'available' as const,
        versionNote,
        body: this.i18n.t('home.experiences.headless.body'),
      },
    ] as const;
  });

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

  protected t(key: SiteMessageKey, params?: Record<string, string>): string {
    return this.i18n.t(key, params);
  }

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
        return this.i18n.t('status.available');
      case 'release-candidate':
        return this.i18n.t('status.releaseCandidate');
      case 'coming-soon':
        return this.i18n.t('status.comingSoon');
    }
  }

  protected availabilityLabel(
    availability: (typeof PAYMENT_METHODS)[number]['availability'],
  ): string {
    switch (availability) {
      case 'available-with-config':
        return this.i18n.t('status.availableWithConfig');
      case 'provider-dependent':
        return this.i18n.t('status.providerSetupRequired');
      case 'not-supported':
        return this.i18n.t('status.notSupported');
    }
  }
}
